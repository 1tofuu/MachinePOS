import { Router, Response } from "express";
import { db } from "../db/connection.js";
import { customers } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

const customerUpdateSchema = customerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one customer field is required"
);

// GET all customers
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = db.select().from(customers).all();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load customers" });
  }
});

// POST register a new customer
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = customerSchema.parse(req.body);
    const existing = db.select().from(customers).where(eq(customers.email, data.email)).get();
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newId = "c_" + Math.random().toString(36).substr(2, 9);
    const newCustomer = {
      id: newId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      totalSpent: 0,
      orderCount: 0,
      loyaltyPoints: 0,
      joinedAt: new Date().toISOString().split("T")[0],
    };

    db.insert(customers).values(newCustomer).run();
    res.status(201).json(newCustomer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to add customer" });
  }
});

// GET single customer
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = db.select().from(customers).where(eq(customers.id, req.params.id)).get();
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load customer" });
  }
});

// PUT update customer profile
router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = customerUpdateSchema.parse(req.body);
    const existing = db.select().from(customers).where(eq(customers.id, req.params.id)).get();
    if (!existing) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (data.email && data.email !== existing.email) {
      const duplicate = db.select().from(customers).where(eq(customers.email, data.email)).get();
      if (duplicate) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }

    const updatedCustomer = {
      ...existing,
      ...data,
      phone: data.phone ?? existing.phone,
    };

    db.update(customers).set(updatedCustomer).where(eq(customers.id, req.params.id)).run();
    res.json(updatedCustomer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to update customer" });
  }
});

// DELETE customer
router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = db.select().from(customers).where(eq(customers.id, req.params.id)).get();
    if (!existing) {
      return res.status(404).json({ message: "Customer not found" });
    }

    db.delete(customers).where(eq(customers.id, req.params.id)).run();
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

export default router;
