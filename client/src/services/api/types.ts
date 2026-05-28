// Domain types shared across features. Backend-ready: shape matches a typical REST API.

export type ID = string;

export type Money = number; // smallest unit not enforced; use number for mock simplicity

export type ProductCategory =
  | "Coffee & Tea"
  | "Pastries"
  | "Cold Sandwiches"
  | "Snacks"
  | "Retail"
  | "Beverages";

export interface Product {
  id: ID;
  name: string;
  sku: string;
  description?: string;
  price: Money;
  cost?: Money;
  category: ProductCategory;
  imageUrl?: string;
  stock: number;
  reorderPoint: number;
  isActive: boolean;
}

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";
export type PaymentMethod = "card" | "cash" | "wallet";

export interface OrderItem {
  productId: ID;
  name: string;
  quantity: number;
  unitPrice: Money;
  unitCost?: Money;
  lineSubtotal?: Money;
  lineCost?: Money;
  lineProfit?: Money;
}

export interface Order {
  id: ID;
  number: string;
  createdAt: string;
  customerId?: ID;
  customerName?: string;
  items: OrderItem[];
  subtotal: Money;
  tax: Money;
  total: Money;
  costTotal?: Money;
  profitTotal?: Money;
  status: OrderStatus;
  payment?: PaymentMethod;
  tableId?: ID;
}

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";
export interface RestaurantTable {
  id: ID;
  label: string;
  seats: number;
  status: TableStatus;
  orderId?: ID;
}

export type TicketStatus = "new" | "in_progress" | "ready";
export interface KitchenTicket {
  id: ID;
  orderNumber: string;
  tableLabel?: string;
  items: { name: string; quantity: number; note?: string }[];
  status: TicketStatus;
  createdAt: string;
}

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  totalSpent: Money;
  orderCount: number;
  loyaltyPoints: number;
  joinedAt: string;
}

export type StaffRole = "admin" | "manager" | "cashier" | "kitchen" | "server";
export type StaffStatus = "active" | "offline" | "on_break";

export interface StaffMember {
  id: ID;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  avatarUrl?: string;
  hireDate: string;
}

export interface StaffLoginHistory {
  id: ID;
  userId: ID;
  name?: string;
  email?: string;
  role?: StaffRole;
  loginTime: string;
  logoutTime?: string | null;
  status: "online" | "offline";
}

export interface KPI {
  label: string;
  value: string;
  delta?: number;
  trend?: "up" | "down" | "flat";
}

export interface RevenuePoint {
  label: string;
  current: number;
  previous: number;
}

export interface TopSeller {
  productId: ID;
  name: string;
  units: number;
  revenue: Money;
  cost?: Money;
  profit?: Money;
}

export interface SalesReport {
  period: "daily" | "monthly";
  key: string;
  revenue: Money;
  cost: Money;
  profit: Money;
  profitMargin: number;
  orderCount: number;
  itemsSold: number;
  averageOrderValue: Money;
  topSellers: TopSeller[];
  series: RevenuePoint[];
}
