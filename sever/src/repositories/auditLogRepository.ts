import { db } from "../db/connection.js";
import { auditLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";

export class AuditLogRepository {
  async create(data: {
    id: string;
    userId: string | null;
    invoiceId: string;
    action: string;
    details?: string;
  }): Promise<any> {
    db.insert(auditLogs).values(data).run();
    return this.findById(data.id);
  }

  async findById(id: string): Promise<any> {
    return db.select().from(auditLogs).where(eq(auditLogs.id, id)).get();
  }

  async findAll(): Promise<any[]> {
    return db.select().from(auditLogs).all();
  }
}

export const auditLogRepository = new AuditLogRepository();
