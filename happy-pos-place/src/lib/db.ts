import { mockProducts, mockOrders, mockCustomers, mockStaff } from "@/services/api/mockData";
import type { Product, Order, Customer, StaffMember } from "@/services/api/types";

const KEYS = {
  products: "ip_products",
  orders: "ip_orders",
  customers: "ip_customers",
  staff: "ip_staff",
  settings: "ip_settings",
};

export interface DbSettings {
  language: "en" | "km";
  currencyMode: "USD" | "KHR" | "BOTH";
  exchangeRate: number; // e.g. 4100
  printerIp: string;
  storeName: string;
  storeAddress: string;
}

const defaultSettings: DbSettings = {
  language: "en",
  currencyMode: "BOTH",
  exchangeRate: 4100,
  printerIp: "192.168.1.150",
  storeName: "InventoryPro Flagship",
  storeAddress: "721 Enterprise Way, Silicon Valley, CA 94025",
};

// Initialize DB helper
export const initDb = () => {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(KEYS.products)) {
    localStorage.setItem(KEYS.products, JSON.stringify(mockProducts));
  }
  if (!localStorage.getItem(KEYS.orders)) {
    localStorage.setItem(KEYS.orders, JSON.stringify(mockOrders));
  }
  if (!localStorage.getItem(KEYS.customers)) {
    localStorage.setItem(KEYS.customers, JSON.stringify(mockCustomers));
  }
  if (!localStorage.getItem(KEYS.staff)) {
    localStorage.setItem(KEYS.staff, JSON.stringify(mockStaff));
  }
  if (!localStorage.getItem(KEYS.settings)) {
    localStorage.setItem(KEYS.settings, JSON.stringify(defaultSettings));
  }
};

export const db = {
  // Products
  getProducts: (): Product[] => {
    initDb();
    try {
      return JSON.parse(localStorage.getItem(KEYS.products) || "[]");
    } catch {
      return mockProducts;
    }
  },
  saveProducts: (products: Product[]) => {
    localStorage.setItem(KEYS.products, JSON.stringify(products));
  },
  addProduct: (product: Omit<Product, "id">): Product => {
    const products = db.getProducts();
    const newProduct: Product = {
      ...product,
      id: "p_" + Math.random().toString(36).substr(2, 9),
    };
    products.unshift(newProduct);
    db.saveProducts(products);
    return newProduct;
  },
  updateProduct: (product: Product): Product => {
    const products = db.getProducts();
    const updated = products.map((p) => (p.id === product.id ? product : p));
    db.saveProducts(updated);
    return product;
  },
  deleteProduct: (id: string) => {
    const products = db.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    db.saveProducts(filtered);
  },

  // Orders
  getOrders: (): Order[] => {
    initDb();
    try {
      return JSON.parse(localStorage.getItem(KEYS.orders) || "[]");
    } catch {
      return mockOrders;
    }
  },
  saveOrders: (orders: Order[]) => {
    localStorage.setItem(KEYS.orders, JSON.stringify(orders));
  },
  addOrder: (order: Omit<Order, "id" | "number" | "createdAt">): Order => {
    const orders = db.getOrders();
    const orderNumber = "#" + (10242 + orders.length);
    const newOrder: Order = {
      ...order,
      id: "o_" + Math.random().toString(36).substr(2, 9),
      number: orderNumber,
      createdAt: new Date().toISOString(),
    };
    
    // Deduct stock for products in the order
    const products = db.getProducts();
    order.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
      }
    });
    db.saveProducts(products);

    orders.unshift(newOrder);
    db.saveOrders(orders);
    return newOrder;
  },

  // Staff
  getStaff: (): StaffMember[] => {
    initDb();
    try {
      return JSON.parse(localStorage.getItem(KEYS.staff) || "[]");
    } catch {
      return mockStaff;
    }
  },
  saveStaff: (staff: StaffMember[]) => {
    localStorage.setItem(KEYS.staff, JSON.stringify(staff));
  },
  addStaff: (member: Omit<StaffMember, "id" | "hireDate">): StaffMember => {
    const staff = db.getStaff();
    const newMember: StaffMember = {
      ...member,
      id: "s_" + Math.random().toString(36).substr(2, 9),
      hireDate: new Date().toISOString().split("T")[0],
    };
    staff.push(newMember);
    db.saveStaff(staff);
    return newMember;
  },
  updateStaff: (member: StaffMember): StaffMember => {
    const staff = db.getStaff();
    const updated = staff.map((s) => (s.id === member.id ? member : s));
    db.saveStaff(updated);
    return member;
  },
  deleteStaff: (id: string) => {
    const staff = db.getStaff();
    const filtered = staff.filter((s) => s.id !== id);
    db.saveStaff(filtered);
  },

  // Customers
  getCustomers: (): Customer[] => {
    initDb();
    try {
      return JSON.parse(localStorage.getItem(KEYS.customers) || "[]");
    } catch {
      return mockCustomers;
    }
  },
  saveCustomers: (customers: Customer[]) => {
    localStorage.setItem(KEYS.customers, JSON.stringify(customers));
  },

  // Settings
  getSettings: (): DbSettings => {
    initDb();
    try {
      return JSON.parse(localStorage.getItem(KEYS.settings) || JSON.stringify(defaultSettings));
    } catch {
      return defaultSettings;
    }
  },
  saveSettings: (settings: DbSettings) => {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  },

  // Reset database to default
  resetDb: () => {
    localStorage.removeItem(KEYS.products);
    localStorage.removeItem(KEYS.orders);
    localStorage.removeItem(KEYS.customers);
    localStorage.removeItem(KEYS.staff);
    localStorage.removeItem(KEYS.settings);
    initDb();
  },
};
