import { Router } from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticateToken, (req, res) => paymentController.createPayment(req, res));
router.get("/:id", authenticateToken, (req, res) => paymentController.getPaymentById(req, res));
router.post("/verify", authenticateToken, (req, res) => paymentController.verifyPayment(req, res));
router.post("/cancel", authenticateToken, (req, res) => paymentController.cancelPayment(req, res));

export default router;
