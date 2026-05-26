import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { staffLoginHistory, users } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { emitStaffStatusChanged } from "../realtime/staffStatus.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_happy_pos_token_key_123!";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    
    // Find user in DB
    const user = db.select().from(users).where(eq(users.email, body.email)).get();
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(body.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token containing identity and role
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Update status to active
    db.update(users)
      .set({ status: "active" })
      .where(eq(users.id, user.id))
      .run();

    db.insert(staffLoginHistory)
      .values({
        id: "slh_" + Math.random().toString(36).slice(2, 11),
        userId: user.id,
        loginTime: new Date().toISOString(),
        logoutTime: null,
        status: "online",
      })
      .run();

    emitStaffStatusChanged();

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/logout", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const latestOpenSession = db
      .select()
      .from(staffLoginHistory)
      .where(eq(staffLoginHistory.userId, userId))
      .orderBy(desc(staffLoginHistory.loginTime))
      .get();

    if (latestOpenSession && !latestOpenSession.logoutTime) {
      db.update(staffLoginHistory)
        .set({
          logoutTime: new Date().toISOString(),
          status: "offline",
        })
        .where(eq(staffLoginHistory.id, latestOpenSession.id))
        .run();
    }

    db.update(users)
      .set({ status: "offline" })
      .where(eq(users.id, userId))
      .run();

    emitStaffStatusChanged();
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
