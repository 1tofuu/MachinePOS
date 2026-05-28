import { Router } from "express";
import { db } from "../db/connection.js";
import { orders, orderItems, products, customers } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";
const router = Router();
const orderItemSchema = z.object({
    productId: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
});
const createOrderSchema = z.object({
    customerId: z.string().optional().nullable(),
    customerName: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
    subtotal: z.number().nonnegative(),
    tax: z.number().nonnegative(),
    total: z.number().nonnegative(),
    status: z.enum(["pending", "preparing", "ready", "completed", "cancelled"]).default("completed"),
    payment: z.enum(["card", "cash", "wallet"]).default("cash"),
});
const orderStatusSchema = z.object({
    status: z.enum(["pending", "preparing", "ready", "completed", "cancelled"]),
});
function attachItems(orderList) {
    const itemsList = db.select().from(orderItems).all();
    return orderList.map((o) => {
        const oItems = itemsList
            .filter((item) => item.orderId === o.id)
            .map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            lineSubtotal: item.lineSubtotal,
            lineCost: item.lineCost,
            lineProfit: item.lineProfit,
        }));
        return {
            ...o,
            items: oItems,
        };
    });
}
// GET all orders with nested order_items
router.get("/", authenticateToken, async (req, res) => {
    try {
        const orderList = db.select().from(orders).all();
        res.json(attachItems(orderList).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load orders" });
    }
});
// GET single order with nested order_items
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json(attachItems([order])[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load order" });
    }
});
// PATCH update order status
router.patch("/:id/status", authenticateToken, async (req, res) => {
    try {
        const { status } = orderStatusSchema.parse(req.body);
        const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        db.update(orders).set({ status }).where(eq(orders.id, req.params.id)).run();
        res.json(attachItems([{ ...order, status }])[0]);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: "Failed to update order status" });
    }
});
// POST create order (Checkout)
router.post("/", authenticateToken, async (req, res) => {
    try {
        const body = createOrderSchema.parse(req.body);
        // 1. Generate Order Number
        const existingCount = db.select().from(orders).all().length;
        const orderNumber = "#" + (10242 + existingCount);
        const orderId = "o_" + Math.random().toString(36).substr(2, 9);
        const createdAt = new Date().toISOString();
        // 2. Perform stock level checks and deductions
        const allProducts = db.select().from(products).all();
        for (const item of body.items) {
            const prod = allProducts.find((p) => p.id === item.productId);
            if (!prod) {
                return res.status(400).json({ message: `Product not found: ${item.name}` });
            }
            if (prod.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${item.name}. Available: ${prod.stock}`
                });
            }
        }
        const enrichedItems = body.items.map((item) => {
            const prod = allProducts.find((p) => p.id === item.productId);
            const unitCost = prod.cost ?? 0;
            const lineSubtotal = Number((item.unitPrice * item.quantity).toFixed(2));
            const lineCost = Number((unitCost * item.quantity).toFixed(2));
            const lineProfit = Number((lineSubtotal - lineCost).toFixed(2));
            return {
                ...item,
                unitCost,
                lineSubtotal,
                lineCost,
                lineProfit,
            };
        });
        const subtotal = Number(enrichedItems.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2));
        const costTotal = Number(enrichedItems.reduce((sum, item) => sum + item.lineCost, 0).toFixed(2));
        const profitTotal = Number((subtotal - costTotal).toFixed(2));
        const total = Number((subtotal + body.tax).toFixed(2));
        // 3. Insert main Order row
        const newOrder = {
            id: orderId,
            number: orderNumber,
            createdAt,
            customerId: body.customerId || null,
            customerName: body.customerName || "Walk-in",
            subtotal,
            tax: body.tax,
            total,
            costTotal,
            profitTotal,
            status: body.status,
            payment: body.payment,
        };
        db.insert(orders).values(newOrder).run();
        // 4. Insert Items & Deduct Stock
        for (const item of enrichedItems) {
            const itemId = "oi_" + Math.random().toString(36).substr(2, 9);
            db.insert(orderItems)
                .values({
                id: itemId,
                orderId,
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCost: item.unitCost,
                lineSubtotal: item.lineSubtotal,
                lineCost: item.lineCost,
                lineProfit: item.lineProfit,
            })
                .run();
            // Deduct stock in SQLite
            const prod = allProducts.find((p) => p.id === item.productId);
            db.update(products)
                .set({ stock: Math.max(0, prod.stock - item.quantity) })
                .where(eq(products.id, item.productId))
                .run();
        }
        // 5. Update Customer loyalty points if completing sale
        if (body.customerId && body.status === "completed") {
            const cust = db.select().from(customers).where(eq(customers.id, body.customerId)).get();
            if (cust) {
                const addedPoints = Math.round(total * 10); // 10 points per dollar
                db.update(customers)
                    .set({
                    totalSpent: cust.totalSpent + total,
                    orderCount: cust.orderCount + 1,
                    loyaltyPoints: cust.loyaltyPoints + addedPoints,
                })
                    .where(eq(customers.id, body.customerId))
                    .run();
            }
        }
        res.status(201).json({
            ...newOrder,
            items: enrichedItems,
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: "Failed to place order" });
    }
});
export default router;
