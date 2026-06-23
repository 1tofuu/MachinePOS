import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

// Load Controllers
import authRouter from "./controllers/auth.js";
import productsRouter from "./controllers/products.js";
import customersRouter from "./controllers/customers.js";
import ordersRouter from "./controllers/orders.js";
import staffRouter from "./controllers/staff.js";
import reportsRouter from "./controllers/reports.js";

// Load New Layered Routers
import invoiceRouter from "./routes/invoiceRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import auditLogRouter from "./routes/auditLogRoutes.js";

import { initializeStaffStatusSocket } from "./realtime/staffStatus.js";
import { startScheduler } from "./scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;
initializeStaffStatusSocket(server);

// Enable CORS with full credentials and headers
app.use(
  cors({
    origin: "*", // allow access from any origin (ideal for local/Postman/frontend ports)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Serve static images from the workspace img folder
app.use("/img", express.static(path.resolve(__dirname, "../../img")));

// Expose API router routes
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/staff", staffRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/audit-logs", auditLogRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("<h1>InventoryPro Enterprise POS API running!</h1>");
});

server.listen(PORT, () => {
  console.log(`🚀 Industry POS server running at: http://localhost:${PORT}`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/health`);
  // startScheduler();
});
