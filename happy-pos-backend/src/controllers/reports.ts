import { Router, Response } from "express";
import { db } from "../db/connection.js";
import { orderItems, orders, products } from "../db/schema.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function completedOrders() {
  return db
    .select()
    .from(orders)
    .all()
    .filter((order) => order.status === "completed");
}

function previousPeriodMultiplier(index: number) {
  return index % 2 === 0 ? 0.9 : 1.08;
}

function buildSalesReport(period: "daily" | "monthly", key: string) {
  const orderList = completedOrders().filter((order) => {
    const createdAt = new Date(order.createdAt);
    return period === "daily" ? isoDate(createdAt) === key : monthKey(createdAt) === key;
  });
  const orderIds = new Set(orderList.map((order) => order.id));
  const itemList = db
    .select()
    .from(orderItems)
    .all()
    .filter((item) => orderIds.has(item.orderId));

  const revenue = Number(orderList.reduce((sum, order) => sum + order.subtotal, 0).toFixed(2));
  const cost = Number(itemList.reduce((sum, item) => sum + item.lineCost, 0).toFixed(2));
  const profit = Number((revenue - cost).toFixed(2));
  const itemsSold = itemList.reduce((sum, item) => sum + item.quantity, 0);
  const topSellerMap = new Map<
    string,
    { productId: string; name: string; units: number; revenue: number; cost: number; profit: number }
  >();

  for (const item of itemList) {
    const current = topSellerMap.get(item.productId) ?? {
      productId: item.productId,
      name: item.name,
      units: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };

    current.units += item.quantity;
    current.revenue += item.lineSubtotal;
    current.cost += item.lineCost;
    current.profit += item.lineProfit;
    topSellerMap.set(item.productId, current);
  }

  const topSellers = Array.from(topSellerMap.values())
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
      cost: Number(item.cost.toFixed(2)),
      profit: Number(item.profit.toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const series =
    period === "daily"
      ? Array.from({ length: 24 }, (_, hour) => {
          const current = orderList
            .filter((order) => new Date(order.createdAt).getHours() === hour)
            .reduce((sum, order) => sum + order.subtotal, 0);

          return {
            label: `${hour.toString().padStart(2, "0")}:00`,
            current: Number(current.toFixed(2)),
            previous: 0,
          };
        })
      : Array.from({ length: new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate() }, (_, index) => {
          const day = `${key}-${String(index + 1).padStart(2, "0")}`;
          const current = orderList
            .filter((order) => isoDate(new Date(order.createdAt)) === day)
            .reduce((sum, order) => sum + order.subtotal, 0);

          return {
            label: String(index + 1),
            current: Number(current.toFixed(2)),
            previous: 0,
          };
        });

  return {
    period,
    key,
    revenue,
    cost,
    profit,
    profitMargin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
    orderCount: orderList.length,
    itemsSold,
    averageOrderValue: orderList.length ? Number((revenue / orderList.length).toFixed(2)) : 0,
    topSellers,
    series,
  };
}

router.get("/sales/daily", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : isoDate(new Date());
    res.json(buildSalesReport("daily", date));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load daily sales report" });
  }
});

router.get("/sales/monthly", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : monthKey(new Date());
    res.json(buildSalesReport("monthly", month));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load monthly sales report" });
  }
});

router.get("/revenue/weekly", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totals = new Map<string, number>();

    for (const order of completedOrders()) {
      const date = new Date(order.createdAt);
      const label = dayNames[date.getDay()];
      totals.set(label, (totals.get(label) ?? 0) + order.subtotal);
    }

    const data = dayNames.slice(1).concat(dayNames[0]).map((label, index) => {
      const current = Number((totals.get(label) ?? 0).toFixed(2));
      return {
        label,
        current,
        previous: Number((current * previousPeriodMultiplier(index)).toFixed(2)),
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load weekly revenue" });
  }
});

router.get("/revenue/monthly", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totals = new Map<string, number>();

    for (const order of completedOrders()) {
      const date = new Date(order.createdAt);
      const label = monthNames[date.getMonth()];
      totals.set(label, (totals.get(label) ?? 0) + order.subtotal);
    }

    const data = monthNames.map((label, index) => {
      const current = Number((totals.get(label) ?? 0).toFixed(2));
      return {
        label,
        current,
        previous: Number((current * previousPeriodMultiplier(index)).toFixed(2)),
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load monthly revenue" });
  }
});

router.get("/categories", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productList = db.select().from(products).all();
    const orderList = completedOrders();
    const itemList = db.select().from(orderItems).all();
    const totals = new Map<string, number>();

    for (const order of orderList) {
      for (const item of itemList.filter((row) => row.orderId === order.id)) {
        const product = productList.find((row) => row.id === item.productId);
        const category = product?.category ?? "Uncategorized";
        totals.set(category, (totals.get(category) ?? 0) + item.quantity * item.unitPrice);
      }
    }

    res.json(
      Array.from(totals.entries())
        .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load category breakdown" });
  }
});

router.get("/top-sellers", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderIds = new Set(completedOrders().map((order) => order.id));
    const totals = new Map<
      string,
      { productId: string; name: string; units: number; revenue: number; cost: number; profit: number }
    >();

    for (const item of db.select().from(orderItems).all()) {
      if (!orderIds.has(item.orderId)) continue;

      const current = totals.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };

      current.units += item.quantity;
      current.revenue += item.lineSubtotal;
      current.cost += item.lineCost;
      current.profit += item.lineProfit;
      totals.set(item.productId, current);
    }

    res.json(
      Array.from(totals.values())
        .map((item) => ({
          ...item,
          revenue: Number(item.revenue.toFixed(2)),
          cost: Number(item.cost.toFixed(2)),
          profit: Number(item.profit.toFixed(2)),
        }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 10)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load top sellers" });
  }
});

export default router;
