import { Router } from "express";
import { auditLogController } from "../controllers/auditLogController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticateToken, (req, res) => auditLogController.getLogs(req, res));

export default router;
