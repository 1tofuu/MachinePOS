import { invoiceService } from "../services/invoiceService.js";
import { z } from "zod";
const createInvoiceSchema = z.object({
    amount: z.number().positive("Amount must be a positive number"),
    invoiceNumber: z.string().min(1, "Invoice number is required").optional(),
});
const updateInvoiceStatusSchema = z.object({
    status: z.enum(["PENDING", "PAID", "EXPIRED", "CANCELLED"], {
        errorMap: () => ({ message: "Status must be PENDING, PAID, EXPIRED, or CANCELLED" })
    }),
});
export class InvoiceController {
    createInvoice = async (req, res) => {
        try {
            const parsedBody = createInvoiceSchema.parse(req.body);
            const invoice = await invoiceService.createInvoice(parsedBody);
            res.status(201).json(invoice);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ message: err.errors[0].message });
                return;
            }
            res.status(400).json({ message: err.message });
        }
    };
    getInvoices = async (req, res) => {
        try {
            const invoicesList = await invoiceService.getInvoices();
            res.status(200).json(invoicesList);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Failed to load invoices" });
        }
    };
    getInvoiceById = async (req, res) => {
        try {
            const { id } = req.params;
            const invoice = await invoiceService.getInvoiceById(id);
            res.status(200).json(invoice);
        }
        catch (err) {
            res.status(404).json({ message: err.message });
        }
    };
    updateInvoiceStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = updateInvoiceStatusSchema.parse(req.body);
            const invoice = await invoiceService.updateInvoiceStatus(id, status);
            res.status(200).json(invoice);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ message: err.errors[0].message });
                return;
            }
            res.status(404).json({ message: err.message });
        }
    };
    reopenInvoice = async (req, res) => {
        try {
            const { id } = req.params;
            const managerId = req.user?.id || "unknown";
            const invoice = await invoiceService.reopenInvoice(id, managerId);
            res.status(200).json(invoice);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    };
}
export const invoiceController = new InvoiceController();
