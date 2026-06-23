import { db } from "./connection.js";
import { products, users, customers, orders, orderItems, staffLoginHistory } from "./schema.js";
import bcrypt from "bcryptjs";

const img = (filename: string) =>
  `/img/${filename}`;

const todayIso = (offsetMinutes = 0) =>
  new Date(Date.now() - offsetMinutes * 60_000).toISOString();

async function runSeed() {
  console.log("🌱 Starting SQLite database seeding...");

  // 1. Wipe database
  console.log("🧹 Clearing old tables...");
  db.delete(staffLoginHistory).run();
  db.delete(orderItems).run();
  db.delete(orders).run();
  db.delete(customers).run();
  db.delete(users).run();
  db.delete(products).run();

  // 2. Hash passwords and insert users
  console.log("👤 Creating staff credentials...");
  const passwordHash = bcrypt.hashSync("Heng112233", 10);

  const seedUsers = [
    {
      id: "s1",
      name: "Pan Bunheng",
      email: "panbunheng58@gmail.com",
      passwordHash: passwordHash,
      role: "admin",
      status: "active",
      hireDate: "2023-05-15",
    },
    {
      id: "s2",
      name: "Nom sokcheat",
      email: "sokcheat@gmail.com",
      passwordHash: bcrypt.hashSync("Nom112233", 10),
      role: "cashier",
      status: "active",
      hireDate: "2026-05-01",
    },
    {
      id: "s3",
      name: "Seang mouyly",
      email: "seangmouyly@gmail.com",
      passwordHash: bcrypt.hashSync("Lyly112233", 10),
      role: "manager",
      status: "active",
      hireDate: "2023-01-15",
    },
    {
      id: "s4",
      name: "Both",
      email: "nika168@gmail.com",
      passwordHash: bcrypt.hashSync("Kaka112233", 10),
      role: "cashier",
      status: "active",
      hireDate: "2024-03-08",
    },
    {
      id: "s5",
      name: "Bothh",
      email: "Bothboth@gmail.com",
      passwordHash: bcrypt.hashSync("both112233", 10),
      role: "cashier",
      status: "offline",
      hireDate: "2024-09-22",
    },
  ];

  for (const u of seedUsers) {
    db.insert(users).values(u).run();
  }

  // 3. Insert products
  console.log("☕ Seeding café menu items...");
  const seedProducts = [
    {
      id: "p1",
      name: "TOM FORD",
      sku: "SKU-1001",
      description: "Perfume 100ml",
      price: 100,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("black.png"),
      stock: 30,
      reorderPoint: 10,
      isActive: true,
    },
    {
      id: "p2",
      name: "BLUE of CHANEL",
      sku: "SKU-1002",
      description: "Perfume 100ml",
      price: 117,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("channel.png"),
      stock: 30,
      reorderPoint: 10,
      isActive: true,
    },
    {
      id: "p3",
      name: "COCO chanel ",
      sku: "SKU-1003",
      description: "Perfume 100ml",
      price: 140,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("coco.png"),
      stock: 45,
      reorderPoint: 20,
      isActive: true,
    },
    {
      id: "p4",
      name: "Red perfume ",
      sku: "SKU-1004",
      description: "16oz • Cold pressed",
      price: 65,
      cost: 45,
      category: "perfume",
      imageUrl: img("e.png"),
      stock: 32,
      reorderPoint: 15,
      isActive: true,
    },
    {
      id: "p5",
      name: "GIO perfume ",
      sku: "SKU-1005",
      description: "Perfume 100ml",
      price: 95,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("gio.png"),
      stock: 18,
      reorderPoint: 10,
      isActive: true,
    },
    {
      id: "p6",
      name: "Good Girl perfume",
      sku: "SKU-1029",
      description: "Perfume 100ml",
      price: 110,
      cost: 45,
      category: "perfume",
      imageUrl: img("goodgirl.png"),
      stock: 142,
      reorderPoint: 60,
      isActive: true,
    },
    {
      id: "p7",
      name: "Dior sauvage",
      sku: "SKU-4402",
      description: "Perfume 120ml",
      price: 110,
      cost: 45,
      category: "Dior",
      imageUrl: img("image.png"),
      stock: 30,
      reorderPoint: 10,
      isActive: true,
    },
    {
      id: "p8",
      name: "LIBRE YSL",
      sku: "SKU-2911",
      description: "Perfume 120ml",
      price: 130,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("image.png"),
      stock: 54,
      reorderPoint: 25,
      isActive: true,
    },
    {
      id: "p9",
      name: "MISS DIOR",
      sku: "SKU-8821",
      description: "Perfume 100ml",
      price: 120,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("missdior.png"),
      stock: 0,
      reorderPoint: 50,
      isActive: true,
    },
    {
      id: "p10",
      name: "BLACK OPIUM",
      sku: "SKU-1010",
      description: "Perfume 100ml",
      price: 115,
      cost: 0.5,
      category: "perfume",
      imageUrl: img("ysl.png"),
      stock: 88,
      reorderPoint: 30,
      isActive: true,
    },
  ];

  for (const p of seedProducts) {
    db.insert(products).values(p).run();
  }

  // 4. Insert customers
  console.log("👥 Seeding customer base...");
  const seedCustomers = [
    {
      id: "c1",
      name: "Jordan Doe",
      email: "jordan@example.com",
      phone: "+1 415 555 0102",
      totalSpent: 482.5,
      orderCount: 27,
      loyaltyPoints: 480,
      joinedAt: "2024-03-12",
    },
    {
      id: "c2",
      name: "Sarah Chen",
      email: "sarah@example.com",
      phone: "+1 415 555 0144",
      totalSpent: 1240.0,
      orderCount: 64,
      loyaltyPoints: 1240,
      joinedAt: "2023-11-04",
    },
    {
      id: "c3",
      name: "Marcus Lee",
      email: "marcus@example.com",
      phone: "+1 415 555 0188",
      totalSpent: 92.4,
      orderCount: 6,
      loyaltyPoints: 90,
      joinedAt: "2025-01-09",
    },
    {
      id: "c4",
      name: "Riley Park",
      email: "riley@example.com",
      phone: "+1 415 555 0211",
      totalSpent: 318.0,
      orderCount: 19,
      loyaltyPoints: 318,
      joinedAt: "2024-07-21",
    },
    {
      id: "c5",
      name: "Avery Stone",
      email: "avery@example.com",
      phone: null,
      totalSpent: 56.2,
      orderCount: 4,
      loyaltyPoints: 56,
      joinedAt: "2025-04-02",
    },
  ];

  for (const c of seedCustomers) {
    db.insert(customers).values(c).run();
  }

  // 5. Insert initial orders and items
  console.log("🛍️ Creating historical transactions...");
  const seedOrders = [
    {
      id: "o1",
      number: "#10241",
      createdAt: todayIso(8),
      customerId: "c1",
      customerName: "Jordan Doe",
      subtotal: 12.75,
      tax: 1.08,
      total: 13.83,
      status: "pending",
      payment: "card",
    },
    {
      id: "o2",
      number: "#10240",
      createdAt: todayIso(22),
      customerId: null,
      customerName: "Walk-in",
      subtotal: 12.0,
      tax: 1.02,
      total: 13.02,
      status: "completed",
      payment: "wallet",
    },
    {
      id: "o3",
      number: "#10239",
      createdAt: todayIso(45),
      customerId: "c2",
      customerName: "Sarah Chen",
      subtotal: 18.25,
      tax: 1.55,
      total: 19.8,
      status: "completed",
      payment: "card",
    },
    {
      id: "o4",
      number: "#10238",
      createdAt: todayIso(120),
      customerId: "c3",
      customerName: "Marcus Lee",
      subtotal: 18.0,
      tax: 1.53,
      total: 19.53,
      status: "completed",
      payment: "cash",
    },
    {
      id: "o5",
      number: "#10237",
      createdAt: todayIso(240),
      customerId: null,
      customerName: "Walk-in",
      subtotal: 9.0,
      tax: 0.77,
      total: 9.77,
      status: "completed",
      payment: "card",
    },
  ];

  const seedItems = [
    { id: "oi1", orderId: "o1", productId: "p1", name: "Artisan Latte", quantity: 2, unitPrice: 4.5 },
    { id: "oi2", orderId: "o1", productId: "p3", name: "Butter Croissant", quantity: 1, unitPrice: 3.75 },
    { id: "oi3", orderId: "o2", productId: "p5", name: "Avocado Toast", quantity: 1, unitPrice: 12.0 },
    { id: "oi4", orderId: "o3", productId: "p4", name: "Green Revive Juice", quantity: 2, unitPrice: 6.5 },
    { id: "oi5", orderId: "o3", productId: "p10", name: "Matcha Latte", quantity: 1, unitPrice: 5.25 },
    { id: "oi6", orderId: "o4", productId: "p8", name: "Ethiopian Arabica", quantity: 1, unitPrice: 18.0 },
    { id: "oi7", orderId: "o5", productId: "p2", name: "Double Espresso", quantity: 3, unitPrice: 3.0 },
  ];

  const enrichedItems = seedItems.map((item) => {
    const product = seedProducts.find((p) => p.id === item.productId);
    const unitCost = product?.cost ?? 0;
    const lineSubtotal = Number((item.unitPrice * item.quantity).toFixed(2));
    const lineCost = Number((unitCost * item.quantity).toFixed(2));
    const lineProfit = Number((lineSubtotal - lineCost).toFixed(2));

    return {
      ...item,
      unitCost,
      lineSubtotal,
      lineCost,
      lineProfit,
    };
  });

  for (const o of seedOrders) {
    const items = enrichedItems.filter((item) => item.orderId === o.id);
    const costTotal = Number(items.reduce((sum, item) => sum + item.lineCost, 0).toFixed(2));
    const profitTotal = Number((o.subtotal - costTotal).toFixed(2));

    db.insert(orders)
      .values({
        ...o,
        costTotal,
        profitTotal,
      })
      .run();
  }

  for (const item of enrichedItems) {
    db.insert(orderItems).values(item).run();
  }

  console.log("🎉 SQLite database successfully seeded!");
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
});
