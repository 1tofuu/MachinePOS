import { Router, Response } from "express";
import { db } from "../db/connection.js";
import { products } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateToken, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().optional(),
  category: z.string().min(1),
  imageUrl: z.string().optional(),
  stock: z.number().int().nonnegative(),
  reorderPoint: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

// GET all products
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = db.select().from(products).all();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load products" });
  }
});

// GET single product
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const prod = db.select().from(products).where(eq(products.id, id)).get();
    if (!prod) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(prod);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load product" });
  }
});

// POST create product
router.post(
  "/",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = productSchema.parse(req.body);
      const newId = "p_" + Math.random().toString(36).substr(2, 9);
      
      const newProduct = {
        ...data,
        id: newId,
      };

      db.insert(products).values(newProduct).run();
      res.status(201).json(newProduct);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Failed to add product" });
    }
  }
);

// PUT update product
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = productSchema.parse(req.body);
      const id = req.params.id;

      const existing = db.select().from(products).where(eq(products.id, id)).get();
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      db.update(products).set(data).where(eq(products.id, id)).run();
      res.json({ id, ...data });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Failed to update product" });
    }
  }
);

// DELETE product
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id;
      const existing = db.select().from(products).where(eq(products.id, id)).get();
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      db.delete(products).where(eq(products.id, id)).run();
      res.json({ message: "Product deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  }
);

export default router;
