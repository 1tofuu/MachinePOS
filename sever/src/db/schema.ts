import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  price: real("price").notNull(),
  cost: real("cost"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  stock: integer("stock").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(10),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("cashier"), // admin, manager, cashier
  status: text("status").notNull().default("offline"), // active, offline, on_break
  avatarUrl: text("avatar_url"),
  hireDate: text("hire_date").notNull(),
});

export const staffLoginHistory = sqliteTable("staff_login_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  loginTime: text("login_time").notNull(),
  logoutTime: text("logout_time"),
  status: text("status").notNull().default("online"), // online, offline
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  totalSpent: real("total_spent").notNull().default(0.0),
  orderCount: integer("order_count").notNull().default(0),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  joinedAt: text("joined_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  number: text("number").notNull().unique(),
  createdAt: text("created_at").notNull(),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull(),
  total: real("total").notNull(),
  costTotal: real("cost_total").notNull().default(0),
  profitTotal: real("profit_total").notNull().default(0),
  status: text("status").notNull().default("completed"), // completed, pending, cancelled
  payment: text("payment"), // cash, card, wallet (representing qr)
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  unitCost: real("unit_cost").notNull().default(0),
  lineSubtotal: real("line_subtotal").notNull().default(0),
  lineCost: real("line_cost").notNull().default(0),
  lineProfit: real("line_profit").notNull().default(0),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, PAID, EXPIRED, CANCELLED
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_invoices_status").on(table.status),
]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionReference: text("transaction_reference").unique(),
  status: text("status").notNull().default("PENDING"), // PENDING, PAID, EXPIRED, CANCELLED
  expiresAt: text("expires_at").notNull(),
  verifiedAt: text("verified_at"),
  verifiedBy: text("verified_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_payments_invoice_id").on(table.invoiceId),
  index("idx_payments_status").on(table.status),
  index("idx_payments_expires_at").on(table.expiresAt),
]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // PAYMENT_CREATED, PAYMENT_VERIFIED, PAYMENT_EXPIRED, PAYMENT_CANCELLED, INVOICE_REOPENED
  timestamp: text("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
  details: text("details"),
}, (table) => [
  index("idx_audit_logs_invoice_id").on(table.invoiceId),
  index("idx_audit_logs_user_id").on(table.userId),
]);
