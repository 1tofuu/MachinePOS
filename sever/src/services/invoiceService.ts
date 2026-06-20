import { InvoiceRepository, invoiceRepository } from "../repositories/invoiceRepository.js";
import { auditLogService } from "./auditLogService.js";

export class InvoiceService {
  constructor(private invoiceRepo: InvoiceRepository) {}

  async createInvoice(data: { amount: number; invoiceNumber?: string }): Promise<any> {
    const amount = Number(data.amount);
    let invoiceNumber = data.invoiceNumber;
    
    if (!invoiceNumber) {
      const existingCount = (await this.invoiceRepo.findAll()).length;
      invoiceNumber = "INV-" + (10001 + existingCount);
    }

    // Check unique invoiceNumber
    const existing = await this.invoiceRepo.findByInvoiceNumber(invoiceNumber);
    if (existing) {
      throw new Error(`Invoice number '${invoiceNumber}' already exists`);
    }

    const id = "inv_" + Math.random().toString(36).substring(2, 11);
    
    return this.invoiceRepo.create({
      id,
      invoiceNumber,
      amount,
      status: "PENDING"
    });
  }

  async getInvoices(): Promise<any[]> {
    return this.invoiceRepo.findAll();
  }

  async getInvoiceById(id: string): Promise<any> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new Error(`Invoice with ID '${id}' not found`);
    }
    return invoice;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<any> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new Error(`Invoice with ID '${id}' not found`);
    }

    const validStatuses = ["PENDING", "PAID", "EXPIRED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status '${status}'`);
    }

    return this.invoiceRepo.updateStatus(id, status);
  }

  async reopenInvoice(id: string, managerId: string): Promise<any> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new Error(`Invoice with ID '${id}' not found`);
    }

    if (invoice.status !== "EXPIRED") {
      throw new Error(`Only EXPIRED invoices can be reopened. Current status is ${invoice.status}`);
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(id, "PENDING");

    // Log action
    await auditLogService.logAction(
      managerId,
      id,
      "INVOICE_REOPENED",
      `Reopened expired invoice '${invoice.invoiceNumber}'`
    );

    return updatedInvoice;
  }
}

export const invoiceService = new InvoiceService(invoiceRepository);
