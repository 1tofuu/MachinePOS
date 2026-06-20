import { paymentRepository } from "../repositories/paymentRepository.js";
import { invoiceRepository } from "../repositories/invoiceRepository.js";
import { auditLogService } from "./auditLogService.js";
export class PaymentService {
    paymentRepo;
    invoiceRepo;
    constructor(paymentRepo, invoiceRepo) {
        this.paymentRepo = paymentRepo;
        this.invoiceRepo = invoiceRepo;
    }
    async createPayment(data, cashierId) {
        const invoice = await this.invoiceRepo.findById(data.invoiceId);
        if (!invoice) {
            throw new Error(`Invoice with ID '${data.invoiceId}' not found`);
        }
        if (invoice.status === "PAID") {
            throw new Error("Invoice is already paid");
        }
        // Set expiration to 15 minutes in the future
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const id = "pay_" + Math.random().toString(36).substring(2, 11);
        const payment = await this.paymentRepo.create({
            id,
            invoiceId: data.invoiceId,
            amount: invoice.amount,
            paymentMethod: data.paymentMethod,
            expiresAt,
            status: "PENDING",
        });
        // Link and update invoice status to PENDING
        await this.invoiceRepo.updateStatus(data.invoiceId, "PENDING");
        // Log action
        await auditLogService.logAction(cashierId || null, data.invoiceId, "PAYMENT_CREATED", `Created payment of amount ${invoice.amount} via ${data.paymentMethod}`);
        return payment;
    }
    async getPaymentById(id) {
        const payment = await this.paymentRepo.findById(id);
        if (!payment) {
            throw new Error(`Payment with ID '${id}' not found`);
        }
        return payment;
    }
    async verifyPayment(id, reference, cashierId) {
        const payment = await this.paymentRepo.findById(id);
        if (!payment) {
            throw new Error(`Payment with ID '${id}' not found`);
        }
        if (payment.status !== "PENDING") {
            throw new Error(`Payment is already in status '${payment.status}'`);
        }
        // Check if expired
        const now = new Date().toISOString();
        if (payment.expiresAt < now) {
            throw new Error("Payment has expired");
        }
        // Check unique transaction reference
        const existingRef = await this.paymentRepo.findByReference(reference);
        if (existingRef && existingRef.id !== id) {
            throw new Error(`Transaction reference '${reference}' already verified for another payment`);
        }
        const verifiedAt = new Date().toISOString();
        const updatedPayment = await this.paymentRepo.verifyPayment(id, reference, cashierId, verifiedAt);
        // Update invoice status to PAID
        await this.invoiceRepo.updateStatus(payment.invoiceId, "PAID");
        // Log action
        await auditLogService.logAction(cashierId, payment.invoiceId, "PAYMENT_VERIFIED", `Verified payment of amount ${payment.amount} with reference ${reference}`);
        return updatedPayment;
    }
    async cancelPayment(id, cashierId) {
        const payment = await this.paymentRepo.findById(id);
        if (!payment) {
            throw new Error(`Payment with ID '${id}' not found`);
        }
        if (payment.status !== "PENDING") {
            throw new Error(`Payment cannot be cancelled from status '${payment.status}'`);
        }
        const updatedPayment = await this.paymentRepo.updateStatus(id, "CANCELLED");
        // Update invoice status to CANCELLED
        await this.invoiceRepo.updateStatus(payment.invoiceId, "CANCELLED");
        // Log action
        await auditLogService.logAction(cashierId || null, payment.invoiceId, "PAYMENT_CANCELLED", `Cancelled payment of amount ${payment.amount}`);
        return updatedPayment;
    }
    async checkExpirations() {
        const now = new Date().toISOString();
        const expiredPayments = await this.paymentRepo.findExpired(now);
        for (const payment of expiredPayments) {
            await this.paymentRepo.updateStatus(payment.id, "EXPIRED");
            await this.invoiceRepo.updateStatus(payment.invoiceId, "EXPIRED");
            // Log action
            await auditLogService.logAction(null, payment.invoiceId, "PAYMENT_EXPIRED", `Payment of amount ${payment.amount} expired automatically`);
        }
    }
}
export const paymentService = new PaymentService(paymentRepository, invoiceRepository);
