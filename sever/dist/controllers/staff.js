import { Router } from "express";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { emitStaffStatusChanged, getStaffLoginHistory } from "../realtime/staffStatus.js";
const router = Router();
const staffCreateSchema = z.object({
    name: z.string().min(2, "Username must be at least 2 characters").max(15, "Username must be 15 characters or fewer"),
    email: z.string().email().refine((value) => value.endsWith("@gmail.com"), {
        message: "Email must end with @gmail.com",
    }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["admin", "manager", "cashier"]),
});
const staffUpdateSchema = z.object({
    name: z.string().min(2, "Username must be at least 2 characters").max(15, "Username must be 15 characters or fewer"),
    email: z.string().email().refine((value) => value.endsWith("@gmail.com"), {
        message: "Email must end with @gmail.com",
    }),
    role: z.enum(["admin", "manager", "cashier"]),
    status: z.enum(["active", "offline", "on_break"]),
});
// GET all staff members (excluding password hash)
router.get("/", authenticateToken, async (req, res) => {
    try {
        const list = db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            status: users.status,
            avatarUrl: users.avatarUrl,
            hireDate: users.hireDate,
        }).from(users).all();
        res.json(list);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load staff" });
    }
});
// GET staff login history (Admin only)
router.get("/login-history", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
        res.json(getStaffLoginHistory().sort((a, b) => b.loginTime.localeCompare(a.loginTime)));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load staff login history" });
    }
});
// POST register new staff member (Admin only)
router.post("/", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
        const data = staffCreateSchema.parse(req.body);
        const existing = db.select().from(users).where(eq(users.email, data.email)).get();
        if (existing) {
            return res.status(400).json({ message: "Email is already registered" });
        }
        const passwordHash = bcrypt.hashSync(data.password, 10);
        const newId = "s_" + Math.random().toString(36).substr(2, 9);
        const hireDate = new Date().toISOString().split("T")[0];
        const newStaff = {
            id: newId,
            name: data.name,
            email: data.email,
            passwordHash,
            role: data.role,
            status: "offline",
            avatarUrl: null,
            hireDate,
        };
        db.insert(users).values(newStaff).run();
        emitStaffStatusChanged();
        // Return staff details without password hash
        const { passwordHash: _passwordHash, ...safeStaff } = newStaff;
        res.status(201).json(safeStaff);
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: "Failed to add staff member" });
    }
});
// PUT update staff member details (Admin only)
router.put("/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
        const data = staffUpdateSchema.parse(req.body);
        const id = req.params.id;
        const existing = db.select().from(users).where(eq(users.id, id)).get();
        if (!existing) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        db.update(users)
            .set({
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
        })
            .where(eq(users.id, id))
            .run();
        emitStaffStatusChanged();
        res.json({
            id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            avatarUrl: existing.avatarUrl,
            hireDate: existing.hireDate,
        });
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: "Failed to update staff member" });
    }
});
// DELETE remove staff member (Admin only)
router.delete("/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
        const id = req.params.id;
        const existing = db.select().from(users).where(eq(users.id, id)).get();
        if (!existing) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        db.delete(users).where(eq(users.id, id)).run();
        emitStaffStatusChanged();
        res.json({ message: "Staff member removed successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete staff member" });
    }
});
export default router;
