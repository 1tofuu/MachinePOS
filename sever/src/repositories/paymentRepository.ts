import { db } from "../db/connection.js";
import { payments } from "../db/schema.js";
import { eq, and, lt } from "drizzle-orm";

export class PaymentRepository {
  async create(data: {
    id: string;
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    expiresAt: string;
    status: string;
  }): Promise<any> {
    db.insert(payments).values(data).run();
    return this.findById(data.id);
  }

  async findById(id: string): Promise<any> {
    return db.select().from(payments).where(eq(payments.id, id)).get();
  }

  async findByReference(reference: string): Promise<any> {
    return db.select().from(payments).where(eq(payments.transactionReference, reference)).get();
  }

  async updateStatus(id: string, status: string): Promise<any> {
    db.update(payments)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(payments.id, id))
      .run();
    return this.findById(id);
  }

  async verifyPayment(
    id: string,
    reference: string,
    verifiedBy: string,
    verifiedAt: string
  ): Promise<any> {
    db.update(payments)
      .set({
        transactionReference: reference,
        verifiedBy,
        verifiedAt,
        status: "PAID",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(payments.id, id))
      .run();
    return this.findById(id);
  }

  async findExpired(now: string): Promise<any[]> {
    return db
      .select()
      .from(payments)
      .where(and(eq(payments.status, "PENDING"), lt(payments.expiresAt, now)))
      .all();
  }
}

export const paymentRepository = new PaymentRepository();
