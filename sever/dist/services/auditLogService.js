import { auditLogRepository } from "../repositories/auditLogRepository.js";
export class AuditLogService {
    auditLogRepo;
    constructor(auditLogRepo) {
        this.auditLogRepo = auditLogRepo;
    }
    async logAction(userId, invoiceId, action, details) {
        const id = "log_" + Math.random().toString(36).substring(2, 11);
        return this.auditLogRepo.create({
            id,
            userId,
            invoiceId,
            action,
            details,
        });
    }
    async getLogs() {
        return this.auditLogRepo.findAll();
    }
}
export const auditLogService = new AuditLogService(auditLogRepository);
