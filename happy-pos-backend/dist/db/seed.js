import { db } from "./connection.js";
import { products, users, customers, orders, orderItems, staffLoginHistory } from "./schema.js";
import bcrypt from "bcryptjs";
const img = (seed) => `https://images.unsplash.com/photo-${seed}?w=400&q=80&auto=format&fit=crop`;
const todayIso = (offsetMinutes = 0) => new Date(Date.now() - offsetMinutes * 60_000).toISOString();
async function runSeed() {
    console.log("🌱 Starting SQLite database seeding...");
    // 1. Wipe database
    console.log("🧹 Clearing old tables...");
    db.delete(staffLoginHistory).run();
    db.delete(orderItems).run();
    db.delete(orders).run();
    db.delete(customers).run();
    db.delete(users).run();
    db.delete(products).run();
    // 2. Hash passwords and insert users
    console.log("👤 Creating staff credentials...");
    const passwordHash = bcrypt.hashSync("Heng112233", 10);
    const seedUsers = [
        {
            id: "s1",
            name: "Pan Bunheng",
            email: "panbunheng58@gmail.com",
            passwordHash: passwordHash,
            role: "admin",
            status: "active",
            hireDate: "2023-05-15",
        },
        {
            id: "s2",
            name: "Alex Rivera",
            email: "alex@inventorypro.com",
            passwordHash: passwordHash,
            role: "admin",
            status: "active",
            hireDate: "2022-06-01",
        },
        {
            id: "s3",
            name: "Jordan Doe",
            email: "jordan@inventorypro.com",
            passwordHash: passwordHash,
            role: "manager",
            status: "active",
            hireDate: "2023-01-15",
        },
        {
            id: "s4",
            name: "Sarah Chen",
            email: "sarah@inventorypro.com",
            passwordHash: passwordHash,
            role: "cashier",
            status: "active",
            hireDate: "2024-03-08",
        },
        {
            id: "s5",
            name: "Marcus Lee",
            email: "marcus@inventorypro.com",
            passwordHash: passwordHash,
            role: "cashier",
            status: "offline",
            hireDate: "2024-09-22",
        },
    ];
    for (const u of seedUsers) {
        db.insert(users).values(u).run();
    }
    // 3. Insert products
    console.log("☕ Seeding café menu items...");
    const seedProducts = [
        {
            id: "p1",
            name: "Artisan Latte",
            sku: "SKU-1001",
            description: "12oz • Double shot",
            price: 4.5,
            cost: 1.2,
            category: "Coffee & Tea",
            imageUrl: img("1561882468-9110e03e0f78"),
            stock: 120,
            reorderPoint: 30,
            isActive: true,
        },
        {
            id: "p2",
            name: "Double Espresso",
            sku: "SKU-1002",
            description: "Standard 2oz",
            price: 3.0,
            cost: 0.8,
            category: "Coffee & Tea",
            imageUrl: img("1510591509098-f4fdc6d0ff04"),
            stock: 200,
            reorderPoint: 40,
            isActive: true,
        },
        {
            id: "p3",
            name: "Butter Croissant",
            sku: "SKU-1003",
            description: "Fresh baked daily",
            price: 3.75,
            cost: 1.1,
            category: "Pastries",
            imageUrl: img("1555507036-ab1f4038808a"),
            stock: 45,
            reorderPoint: 20,
            isActive: true,
        },
        {
            id: "p4",
            name: "Green Revive Juice",
            sku: "SKU-1004",
            description: "16oz • Cold pressed",
            price: 6.5,
            cost: 2.3,
            category: "Beverages",
            imageUrl: img("1610970881699-44a5587cabec"),
            stock: 32,
            reorderPoint: 15,
            isActive: true,
        },
        {
            id: "p5",
            name: "Avocado Toast",
            sku: "SKU-1005",
            description: "Sourdough • Organic",
            price: 12.0,
            cost: 3.5,
            category: "Cold Sandwiches",
            imageUrl: img("1588137378633-dea1336ce1e2"),
            stock: 18,
            reorderPoint: 10,
            isActive: true,
        },
        {
            id: "p6",
            name: "Ancient Grain Pretzels",
            sku: "SKU-1029",
            description: "Organic snacks",
            price: 4.25,
            cost: 1.0,
            category: "Snacks",
            imageUrl: img("1559656914-a30970c1affd"),
            stock: 142,
            reorderPoint: 60,
            isActive: true,
        },
        {
            id: "p7",
            name: "Arctic Spring Water",
            sku: "SKU-4402",
            description: "Bottled water",
            price: 2.5,
            cost: 0.4,
            category: "Beverages",
            imageUrl: img("1548839140-29a749e1cf4d"),
            stock: 12,
            reorderPoint: 30,
            isActive: true,
        },
        {
            id: "p8",
            name: "Ethiopian Arabica",
            sku: "SKU-2911",
            description: "Whole bean • 12oz bag",
            price: 18.0,
            cost: 7.2,
            category: "Coffee & Tea",
            imageUrl: img("1559496417-e7f25cb247f3"),
            stock: 54,
            reorderPoint: 25,
            isActive: true,
        },
        {
            id: "p9",
            name: "Volt Max Energy",
            sku: "SKU-8821",
            description: "Carbonated energy drink",
            price: 3.5,
            cost: 0.9,
            category: "Beverages",
            imageUrl: img("1622543925917-9bc9f4fff084"),
            stock: 0,
            reorderPoint: 50,
            isActive: true,
        },
        {
            id: "p10",
            name: "Matcha Latte",
            sku: "SKU-1010",
            description: "Ceremonial grade",
            price: 5.25,
            cost: 1.6,
            category: "Coffee & Tea",
            imageUrl: img("1536256263959-770b48d82b0a"),
            stock: 88,
            reorderPoint: 30,
            isActive: true,
        },
    ];
    for (const p of seedProducts) {
        db.insert(products).values(p).run();
    }
    // 4. Insert customers
    console.log("👥 Seeding customer base...");
    const seedCustomers = [
        {
            id: "c1",
            name: "Jordan Doe",
            email: "jordan@example.com",
            phone: "+1 415 555 0102",
            totalSpent: 482.5,
            orderCount: 27,
            loyaltyPoints: 480,
            joinedAt: "2024-03-12",
        },
        {
            id: "c2",
            name: "Sarah Chen",
            email: "sarah@example.com",
            phone: "+1 415 555 0144",
            totalSpent: 1240.0,
            orderCount: 64,
            loyaltyPoints: 1240,
            joinedAt: "2023-11-04",
        },
        {
            id: "c3",
            name: "Marcus Lee",
            email: "marcus@example.com",
            phone: "+1 415 555 0188",
            totalSpent: 92.4,
            orderCount: 6,
            loyaltyPoints: 90,
            joinedAt: "2025-01-09",
        },
        {
            id: "c4",
            name: "Riley Park",
            email: "riley@example.com",
            phone: "+1 415 555 0211",
            totalSpent: 318.0,
            orderCount: 19,
            loyaltyPoints: 318,
            joinedAt: "2024-07-21",
        },
        {
            id: "c5",
            name: "Avery Stone",
            email: "avery@example.com",
            phone: null,
            totalSpent: 56.2,
            orderCount: 4,
            loyaltyPoints: 56,
            joinedAt: "2025-04-02",
        },
    ];
    for (const c of seedCustomers) {
        db.insert(customers).values(c).run();
    }
    // 5. Insert initial orders and items
    console.log("🛍️ Creating historical transactions...");
    const seedOrders = [
        {
            id: "o1",
            number: "#10241",
            createdAt: todayIso(8),
            customerId: "c1",
            customerName: "Jordan Doe",
            subtotal: 12.75,
            tax: 1.08,
            total: 13.83,
            status: "pending",
            payment: "card",
        },
        {
            id: "o2",
            number: "#10240",
            createdAt: todayIso(22),
            customerId: null,
            customerName: "Walk-in",
            subtotal: 12.0,
            tax: 1.02,
            total: 13.02,
            status: "completed",
            payment: "wallet",
        },
        {
            id: "o3",
            number: "#10239",
            createdAt: todayIso(45),
            customerId: "c2",
            customerName: "Sarah Chen",
            subtotal: 18.25,
            tax: 1.55,
            total: 19.8,
            status: "completed",
            payment: "card",
        },
        {
            id: "o4",
            number: "#10238",
            createdAt: todayIso(120),
            customerId: "c3",
            customerName: "Marcus Lee",
            subtotal: 18.0,
            tax: 1.53,
            total: 19.53,
            status: "completed",
            payment: "cash",
        },
        {
            id: "o5",
            number: "#10237",
            createdAt: todayIso(240),
            customerId: null,
            customerName: "Walk-in",
            subtotal: 9.0,
            tax: 0.77,
            total: 9.77,
            status: "completed",
            payment: "card",
        },
    ];
    const seedItems = [
        { id: "oi1", orderId: "o1", productId: "p1", name: "Artisan Latte", quantity: 2, unitPrice: 4.5 },
        { id: "oi2", orderId: "o1", productId: "p3", name: "Butter Croissant", quantity: 1, unitPrice: 3.75 },
        { id: "oi3", orderId: "o2", productId: "p5", name: "Avocado Toast", quantity: 1, unitPrice: 12.0 },
        { id: "oi4", orderId: "o3", productId: "p4", name: "Green Revive Juice", quantity: 2, unitPrice: 6.5 },
        { id: "oi5", orderId: "o3", productId: "p10", name: "Matcha Latte", quantity: 1, unitPrice: 5.25 },
        { id: "oi6", orderId: "o4", productId: "p8", name: "Ethiopian Arabica", quantity: 1, unitPrice: 18.0 },
        { id: "oi7", orderId: "o5", productId: "p2", name: "Double Espresso", quantity: 3, unitPrice: 3.0 },
    ];
    const enrichedItems = seedItems.map((item) => {
        const product = seedProducts.find((p) => p.id === item.productId);
        const unitCost = product?.cost ?? 0;
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
    for (const o of seedOrders) {
        const items = enrichedItems.filter((item) => item.orderId === o.id);
        const costTotal = Number(items.reduce((sum, item) => sum + item.lineCost, 0).toFixed(2));
        const profitTotal = Number((o.subtotal - costTotal).toFixed(2));
        db.insert(orders)
            .values({
            ...o,
            costTotal,
            profitTotal,
        })
            .run();
    }
    for (const item of enrichedItems) {
        db.insert(orderItems).values(item).run();
    }
    console.log("🎉 SQLite database successfully seeded!");
}
runSeed().catch((err) => {
    console.error("❌ Seeding failed:", err);
});
