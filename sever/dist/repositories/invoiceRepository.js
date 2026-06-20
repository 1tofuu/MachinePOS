import { db } from "../db/connection.js";
import { invoices } from "../db/schema.js";
import { eq } from "drizzle-orm";
export class InvoiceRepository {
    async create(data) {
        db.insert(invoices).values(data).run();
        return this.findById(data.id);
    }
    async findAll() {
        return db.select().from(invoices).all();
    }
    async findById(id) {
        return db.select().from(invoices).where(eq(invoices.id, id)).get();
    }
    async findByInvoiceNumber(invoiceNumber) {
        return db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).get();
    }
    async updateStatus(id, status) {
        db.update(invoices)
            .set({ status, updatedAt: new Date().toISOString() })
            .where(eq(invoices.id, id))
            .run();
        return this.findById(id);
    }
}
export const invoiceRepository = new InvoiceRepository();
