import { desc, eq } from "drizzle-orm";
import { db } from "./connection.js";
import { orderItems, orders, products } from "./schema.js";

const command = process.argv[2] || "status";
const arg = process.argv[3];
const args = process.argv.slice(3);

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function stockStatus(stock: number, reorderPoint: number) {
  if (stock === 0) return "OUT";
  if (stock <= reorderPoint) return "LOW";
  return "OK";
}

function printTitle(title: string) {
  console.log("");
  console.log(`=== ${title} ===`);
  console.log("");
}

function printStatus() {
  const productList = db.select().from(products).all();
  const orderList = db.select().from(orders).all();

  const lowStock = productList.filter(
    (product) => product.stock > 0 && product.stock <= product.reorderPoint,
  ).length;
  const outOfStock = productList.filter((product) => product.stock === 0).length;
  const totalStockValue = productList.reduce(
    (sum, product) => sum + product.stock * product.price,
    0,
  );
  const completedRevenue = orderList
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + order.subtotal, 0);
  const completedCost = orderList
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + order.costTotal, 0);
  const completedProfit = completedRevenue - completedCost;

  printTitle("POS Database Status");
  console.table([
    {
      Products: productList.length,
      Orders: orderList.length,
      "Low Stock": lowStock,
      "Out Of Stock": outOfStock,
      "Stock Value": money(totalStockValue),
      "Sales Amount": money(completedRevenue),
      "Principal Cost": money(completedCost),
      Profit: money(completedProfit),
    },
  ]);
}

function printProducts() {
  const productList = db.select().from(products).all();

  printTitle("Inventory Stock Levels");
  console.table(
    productList.map((product) => ({
      SKU: product.sku,
      Product: product.name,
      Category: product.category,
      Price: money(product.price),
      Stock: product.stock,
      "Reorder At": product.reorderPoint,
      Status: stockStatus(product.stock, product.reorderPoint),
    })),
  );
}

function printProduct(productId: string | undefined) {
  if (!productId) {
    console.error("Missing product id. Example: npm run db:product -- p1");
    process.exitCode = 1;
    return;
  }

  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    console.error(`Product not found: ${productId}`);
    process.exitCode = 1;
    return;
  }

  printTitle(`Product Detail: ${product.name}`);
  console.table([
    {
      ID: product.id,
      SKU: product.sku,
      Product: product.name,
      Category: product.category,
      Price: money(product.price),
      Cost: product.cost === null ? "-" : money(product.cost),
      Stock: product.stock,
      "Reorder At": product.reorderPoint,
      Status: stockStatus(product.stock, product.reorderPoint),
    },
  ]);
}

function getOption(name: string) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

function parseRequiredNumber(value: string | undefined, label: string) {
  const parsed = Number(value);
  if (value === undefined || Number.isNaN(parsed)) {
    throw new Error(`Missing or invalid ${label}`);
  }
  return parsed;
}

function parseRequiredInteger(value: string | undefined, label: string) {
  const parsed = parseRequiredNumber(value, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number`);
  }
  return parsed;
}

function printProductRow(productId: string) {
  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) return;

  console.table([
    {
      ID: product.id,
      SKU: product.sku,
      Product: product.name,
      Category: product.category,
      Price: money(product.price),
      Stock: product.stock,
      "Reorder At": product.reorderPoint,
      Status: stockStatus(product.stock, product.reorderPoint),
    },
  ]);
}

function restockProduct(productId: string | undefined, amountInput: string | undefined) {
  if (!productId) {
    console.error("Missing product id. Example: npm run db:restock -- p1 25");
    process.exitCode = 1;
    return;
  }

  let amount: number;
  try {
    amount = parseRequiredInteger(amountInput, "restock amount");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  if (amount <= 0) {
    console.error("Restock amount must be greater than 0");
    process.exitCode = 1;
    return;
  }

  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    console.error(`Product not found: ${productId}`);
    process.exitCode = 1;
    return;
  }

  db.update(products)
    .set({ stock: product.stock + amount })
    .where(eq(products.id, productId))
    .run();

  printTitle(`Restocked ${product.name}`);
  console.log(`Added ${amount} units. Stock moved from ${product.stock} to ${product.stock + amount}.`);
  printProductRow(productId);
}

function addProduct() {
  try {
    const name = getOption("name");
    const sku = getOption("sku");
    const category = getOption("category");
    const price = parseRequiredNumber(getOption("price"), "price");
    const stock = parseRequiredInteger(getOption("stock"), "stock");
    const reorderPoint = parseRequiredInteger(getOption("reorder"), "reorder point");
    const costInput = getOption("cost");

    if (!name || !sku || !category) {
      throw new Error("Missing required fields: --name, --sku, and --category");
    }

    const existing = db.select().from(products).where(eq(products.sku, sku)).get();
    if (existing) {
      throw new Error(`SKU already exists: ${sku}`);
    }

    const product = {
      id: "p_" + Math.random().toString(36).slice(2, 11),
      name,
      sku,
      description: getOption("description") || "",
      price,
      cost: costInput === undefined ? 0 : parseRequiredNumber(costInput, "cost"),
      category,
      imageUrl: getOption("image-url") || "",
      stock,
      reorderPoint,
      isActive: true,
    };

    db.insert(products).values(product).run();

    printTitle(`Added Product: ${product.name}`);
    printProductRow(product.id);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.log(
      'Example: npm run db:add-product -- --name "Iced Americano" --sku SKU-2001 --category "Coffee & Tea" --price 3.5 --stock 50 --reorder 15 --cost 0.9',
    );
    process.exitCode = 1;
  }
}

function deleteProduct(productId: string | undefined) {
  if (!productId) {
    console.error("Missing product id. Example: npm run db:delete-product -- p1");
    process.exitCode = 1;
    return;
  }

  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    console.error(`Product not found: ${productId}`);
    process.exitCode = 1;
    return;
  }

  db.delete(products).where(eq(products.id, productId)).run();

  printTitle(`Deleted Product: ${product.name}`);
  console.table([
    {
      ID: product.id,
      SKU: product.sku,
      Product: product.name,
      "Deleted From Inventory": "YES",
    },
  ]);
}

function printOrders() {
  const orderList = db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(10)
    .all();
  const itemList = db.select().from(orderItems).all();

  printTitle("Recent Orders");
  console.table(
    orderList.map((order) => {
      const items = itemList.filter((item) => item.orderId === order.id);

      return {
        Number: order.number,
        Customer: order.customerName || "Walk-in",
        Items: items.reduce((sum, item) => sum + item.quantity, 0),
        Total: money(order.total),
        Status: order.status,
        Payment: order.payment || "-",
        Created: order.createdAt,
      };
    }),
  );
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function printSalesReport(period: "daily" | "monthly", key: string | undefined) {
  const reportKey = key || (period === "daily" ? isoDate(new Date()) : monthKey(new Date()));
  const orderList = db
    .select()
    .from(orders)
    .all()
    .filter((order) => {
      if (order.status !== "completed") return false;
      const createdAt = new Date(order.createdAt);
      return period === "daily" ? isoDate(createdAt) === reportKey : monthKey(createdAt) === reportKey;
    });
  const orderIds = new Set(orderList.map((order) => order.id));
  const itemList = db
    .select()
    .from(orderItems)
    .all()
    .filter((item) => orderIds.has(item.orderId));
  const revenue = orderList.reduce((sum, order) => sum + order.total, 0);
  const salesAmount = orderList.reduce((sum, order) => sum + order.subtotal, 0);
  const principalCost = itemList.reduce((sum, item) => sum + item.lineCost, 0);
  const profit = salesAmount - principalCost;
  const itemsSold = itemList.reduce((sum, item) => sum + item.quantity, 0);
  const topSellerMap = new Map<
    string,
    { Product: string; Units: number; Sales: number; Cost: number; Profit: number }
  >();

  for (const item of itemList) {
    const current = topSellerMap.get(item.productId) ?? {
      Product: item.name,
      Units: 0,
      Sales: 0,
      Cost: 0,
      Profit: 0,
    };

    current.Units += item.quantity;
    current.Sales += item.lineSubtotal;
    current.Cost += item.lineCost;
    current.Profit += item.lineProfit;
    topSellerMap.set(item.productId, current);
  }

  printTitle(`${period === "daily" ? "Daily" : "Monthly"} Sales Report: ${reportKey}`);
  console.table([
    {
      "Sales Amount": money(salesAmount),
      Tax: money(revenue - salesAmount),
      "Total Collected": money(revenue),
      "Principal Cost": money(principalCost),
      Profit: money(profit),
      "Profit Margin": salesAmount > 0 ? `${((profit / salesAmount) * 100).toFixed(2)}%` : "0.00%",
      Orders: orderList.length,
      "Items Sold": itemsSold,
      "Average Order": money(orderList.length ? salesAmount / orderList.length : 0),
    },
  ]);

  const topSellers = Array.from(topSellerMap.values())
    .sort((a, b) => b.Sales - a.Sales)
    .slice(0, 10)
    .map((item) => ({
      Product: item.Product,
      Units: item.Units,
      Sales: money(item.Sales),
      Cost: money(item.Cost),
      Profit: money(item.Profit),
    }));

  if (topSellers.length > 0) {
    printTitle("Top Sellers");
    console.table(topSellers);
  }
}

switch (command) {
  case "status":
    printStatus();
    break;
  case "products":
    printProducts();
    break;
  case "product":
    printProduct(arg);
    break;
  case "orders":
    printOrders();
    break;
  case "restock":
    restockProduct(arg, process.argv[4]);
    break;
  case "add-product":
    addProduct();
    break;
  case "delete-product":
    deleteProduct(arg);
    break;
  case "sales-daily":
    printSalesReport("daily", arg);
    break;
  case "sales-monthly":
    printSalesReport("monthly", arg);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log(
      "Available commands: status, products, product <id>, orders, restock <id> <amount>, add-product, delete-product <id>, sales-daily <YYYY-MM-DD>, sales-monthly <YYYY-MM>",
    );
    process.exitCode = 1;
}
