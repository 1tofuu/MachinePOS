import { useAuthStore } from "@/stores/auth";
import { mockTables, mockTickets } from "./mockData";
import type {
  Customer,
  KitchenTicket,
  Order,
  Product,
  RestaurantTable,
  RevenuePoint,
  SalesReport,
  StaffLoginHistory,
  StaffMember,
  TopSeller,
} from "./types";
import { API_URL } from "@/config/env";
const BASE_URL = API_URL + "/api";

const delay = <T,>(data: T, ms = 300): Promise<T> =>
  new Promise((res) => setTimeout(() => res(data), ms));

// Core fetch helper with JWT validation support
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch { }
    throw new Error(errMsg);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export const api = {
  // Products / inventory (linked to SQLite DB)
  listProducts: (): Promise<Product[]> => apiFetch<Product[]>("/products"),
  getProduct: (id: string): Promise<Product | undefined> =>
    apiFetch<Product>(`/products/${id}`).catch(() => undefined),
  createProduct: (product: Omit<Product, "id">): Promise<Product> =>
    apiFetch<Product>("/products", {
      method: "POST",
      body: JSON.stringify(product),
    }),
  updateProduct: (product: Product): Promise<Product> =>
    apiFetch<Product>(`/products/${product.id}`, {
      method: "PUT",
      body: JSON.stringify(product),
    }),
  deleteProduct: (id: string): Promise<void> =>
    apiFetch<void>(`/products/${id}`, {
      method: "DELETE",
    }),

  // Orders / transactions (linked to SQLite DB)
  listOrders: (): Promise<Order[]> => apiFetch<Order[]>("/orders"),
  createOrder: (order: Omit<Order, "id" | "number" | "createdAt">): Promise<Order> =>
    apiFetch<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),

  // Restaurant Tables (retained local state mock)
  listTables: (): Promise<RestaurantTable[]> => delay(mockTables),

  // Kitchen Tickets (retained local state mock)
  listTickets: (): Promise<KitchenTicket[]> => delay(mockTickets),

  // Customers (linked to SQLite DB)
  listCustomers: (): Promise<Customer[]> => apiFetch<Customer[]>("/customers"),

  // Staff / users (linked to SQLite DB)
  listStaff: (): Promise<StaffMember[]> => apiFetch<StaffMember[]>("/staff"),
  createStaff: (member: Pick<StaffMember, "name" | "email" | "role"> & { password: string }): Promise<StaffMember> =>
    apiFetch<StaffMember>("/staff", {
      method: "POST",
      body: JSON.stringify(member),
    }),
  updateStaff: (member: StaffMember): Promise<StaffMember> =>
    apiFetch<StaffMember>(`/staff/${member.id}`, {
      method: "PUT",
      body: JSON.stringify(member),
    }),
  deleteStaff: (id: string): Promise<void> =>
    apiFetch<void>(`/staff/${id}`, {
      method: "DELETE",
    }),
  listStaffLoginHistory: (): Promise<StaffLoginHistory[]> =>
    apiFetch<StaffLoginHistory[]>("/staff/login-history"),

  // Analytics / reports (retained local state mock)
  revenueWeekly: (): Promise<RevenuePoint[]> => apiFetch<RevenuePoint[]>("/reports/revenue/weekly"),
  revenueMonthly: (): Promise<RevenuePoint[]> => apiFetch<RevenuePoint[]>("/reports/revenue/monthly"),
  salesDaily: (date: string): Promise<SalesReport> =>
    apiFetch<SalesReport>(`/reports/sales/daily?date=${encodeURIComponent(date)}`),
  salesMonthly: (month: string): Promise<SalesReport> =>
    apiFetch<SalesReport>(`/reports/sales/monthly?month=${encodeURIComponent(month)}`),
  categoryBreakdown: (): Promise<{ name: string; value: number }[]> =>
    apiFetch<{ name: string; value: number }[]>("/reports/categories"),
  topSellers: (): Promise<TopSeller[]> => apiFetch<TopSeller[]>("/reports/top-sellers"),

  // Payment integration
  getPayment: (id: string): Promise<any> => apiFetch<any>(`/payments/${id}`),
  getInvoice: (id: string): Promise<any> => apiFetch<any>(`/invoices/${id}`),
  createPayment: (invoiceId: string, paymentMethod: string): Promise<any> =>
    apiFetch<any>("/payments", {
      method: "POST",
      body: JSON.stringify({ invoiceId, paymentMethod }),
    }),
  verifyPayment: (paymentId: string, transactionReference: string): Promise<any> =>
    apiFetch<any>("/payments/verify", {
      method: "POST",
      body: JSON.stringify({ paymentId, transactionReference }),
    }),
  cancelPayment: (paymentId: string): Promise<any> =>
    apiFetch<any>("/payments/cancel", {
      method: "POST",
      body: JSON.stringify({ paymentId }),
    }),
};

export type Api = typeof api;
