import { AuditLogRepository, auditLogRepository } from "../repositories/auditLogRepository.js";

export class AuditLogService {
  constructor(private auditLogRepo: AuditLogRepository) {}

  async logAction(
    userId: string | null,
    invoiceId: string,
    action: string,
    details?: string
  ): Promise<any> {
    const id = "log_" + Math.random().toString(36).substring(2, 11);
    return this.auditLogRepo.create({
      id,
      userId,
      invoiceId,
      action,
      details,
    });
  }

  async getLogs(): Promise<any[]> {
    return this.auditLogRepo.findAll();
  }
}

export const auditLogService = new AuditLogService(auditLogRepository);
