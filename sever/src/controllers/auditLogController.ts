import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { auditLogService } from "../services/auditLogService.js";

export class AuditLogController {
  getLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const logs = await auditLogService.getLogs();
      res.status(200).json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load audit logs" });
    }
  };
}

export const auditLogController = new AuditLogController();
