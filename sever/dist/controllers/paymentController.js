import { paymentService } from "../services/paymentService.js";
import { z } from "zod";
const createPaymentSchema = z.object({
    invoiceId: z.string().min(1, "Invoice ID is required"),
    paymentMethod: z.string().min(1, "Payment method is required"),
});
const verifyPaymentSchema = z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
    transactionReference: z.string().min(1, "Transaction reference is required"),
});
const cancelPaymentSchema = z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
});
export class PaymentController {
    createPayment = async (req, res) => {
        try {
            const parsedBody = createPaymentSchema.parse(req.body);
            const cashierId = req.user?.id;
            const payment = await paymentService.createPayment(parsedBody, cashierId);
            res.status(201).json(payment);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ message: err.errors[0].message });
                return;
            }
            res.status(400).json({ message: err.message });
        }
    };
    getPaymentById = async (req, res) => {
        try {
            const { id } = req.params;
            const payment = await paymentService.getPaymentById(id);
            res.status(200).json(payment);
        }
        catch (err) {
            res.status(404).json({ message: err.message });
        }
    };
    verifyPayment = async (req, res) => {
        try {
            const parsedBody = verifyPaymentSchema.parse(req.body);
            const cashierId = req.user?.id || "unknown";
            const payment = await paymentService.verifyPayment(parsedBody.paymentId, parsedBody.transactionReference, cashierId);
            res.status(200).json(payment);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ message: err.errors[0].message });
                return;
            }
            res.status(400).json({ message: err.message });
        }
    };
    cancelPayment = async (req, res) => {
        try {
            const parsedBody = cancelPaymentSchema.parse(req.body);
            const cashierId = req.user?.id;
            const payment = await paymentService.cancelPayment(parsedBody.paymentId, cashierId);
            res.status(200).json(payment);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                res.status(400).json({ message: err.errors[0].message });
                return;
            }
            res.status(400).json({ message: err.message });
        }
    };
}
export const paymentController = new PaymentController();
