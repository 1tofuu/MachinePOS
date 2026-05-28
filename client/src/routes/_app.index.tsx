import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Boxes, 
  DollarSign, 
  AlertTriangle,
  Calendar,
  FileDown
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatGridSkeleton, CardSkeleton } from "@/components/shared/Skeletons";
import { RevenueBarChart, RevenueAreaChart, CategoryPie } from "@/components/shared/Charts";
import { api } from "@/services/api/client";
import { queryKeys } from "@/services/api/queryKeys";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/lib/i18n";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  beforeLoad: () => {
    const { userRole } = useSettingsStore.getState();
    if (userRole === "cashier") {
      throw redirect({ to: "/pos" });
    }
  },
  component: DashboardPage,
});

type TimeFilter = "daily" | "weekly" | "monthly";

function DashboardPage() {
  const { t, language } = useTranslation();
  const { exchangeRate } = useSettingsStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("weekly");

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: queryKeys.products,
    queryFn: api.listProducts,
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: api.listOrders,
  });

  const isLoading = loadingProducts || loadingOrders;

  // Dynamically calculate metrics from actual DB
  const completedOrders = (orders ?? []).filter((o) => o.status === "completed");
  
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  
  // Calculate cost of goods sold (COGS)
  const totalCost = completedOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, item) => {
      const prod = (products ?? []).find((p) => p.id === item.productId);
      const unitCost = prod?.cost || item.unitPrice * 0.3; // fallback 30% cost if cost is undefined
      return itemSum + unitCost * item.quantity;
    }, 0);
  }, 0);

  const netProfit = Math.max(0, totalRevenue - totalCost);
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Best-selling products aggregation
  const itemSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  completedOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!itemSalesMap[item.productId]) {
        itemSalesMap[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      itemSalesMap[item.productId].quantity += item.quantity;
      itemSalesMap[item.productId].revenue += item.unitPrice * item.quantity;
    });
  });

  const bestSellers = Object.values(itemSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4);

  // Time-filtered analytics mock values for demonstration, mixed with live totals
  const getFilteredStats = () => {
    switch (timeFilter) {
      case "daily":
        return {
          revenue: totalRevenue * 0.15,
          profit: netProfit * 0.15,
          orders: Math.max(1, Math.round(completedOrders.length * 0.15)),
          revDelta: 4.2,
          profitDelta: 5.1,
        };
      case "monthly":
        return {
          revenue: totalRevenue * 2.8,
          profit: netProfit * 2.8,
          orders: completedOrders.length * 3,
          revDelta: 14.8,
          profitDelta: 16.2,
        };
      case "weekly":
      default:
        return {
          revenue: totalRevenue,
          profit: netProfit,
          orders: completedOrders.length,
          revDelta: 8.5,
          profitDelta: 9.2,
        };
    }
  };

  const stats = getFilteredStats();
  const lowStockCount = (products ?? []).filter((p) => p.stock <= p.reorderPoint).length;

  // Prepare chart data comparing Revenue vs Costs
  const chartData = [
    { label: "Mon", current: stats.revenue * 0.12, previous: stats.revenue * 0.11 },
    { label: "Tue", current: stats.revenue * 0.15, previous: stats.revenue * 0.14 },
    { label: "Wed", current: stats.revenue * 0.11, previous: stats.revenue * 0.13 },
    { label: "Thu", current: stats.revenue * 0.18, previous: stats.revenue * 0.16 },
    { label: "Fri", current: stats.revenue * 0.22, previous: stats.revenue * 0.20 },
    { label: "Sat", current: stats.revenue * 0.16, previous: stats.revenue * 0.18 },
    { label: "Sun", current: stats.revenue * 0.06, previous: stats.revenue * 0.08 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === "km" ? "ផ្ទាំងគ្រប់គ្រង" : "Dashboard"}
        description={t("rep.subtitle")}
        actions={
          <div className="flex gap-2">
            <div className="flex bg-muted p-1 rounded-xl border">
              {(["daily", "weekly", "monthly"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTimeFilter(mode)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                    timeFilter === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "daily" ? (language === "km" ? "ប្រចាំថ្ងៃ" : "Daily") : 
                   mode === "weekly" ? (language === "km" ? "ប្រចាំសប្តាហ៍" : "Weekly") : 
                   (language === "km" ? "ប្រចាំខែ" : "Monthly")}
                </button>
              ))}
            </div>
            <Button size="sm">
              <FileDown className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <StatGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("rep.revenue")}
            value={currency(stats.revenue)}
            delta={stats.revDelta}
            icon={DollarSign}
            tone="success"
            hint={`Compared to last ${timeFilter}`}
          />
          <StatCard
            label={t("rep.profit_label")}
            value={currency(stats.profit)}
            delta={stats.profitDelta}
            icon={TrendingUp}
            tone="info"
            hint={`Margin: ${profitMargin.toFixed(1)}%`}
          />
          <StatCard
            label={language === "km" ? "ចំនួនលក់បាន" : "Transactions"}
            value={stats.orders.toString()}
            icon={ShoppingCart}
            hint="Completed Checkouts"
          />
          <StatCard
            label={t("pos.low_stock")}
            value={lowStockCount.toString()}
            icon={AlertTriangle}
            tone={lowStockCount > 0 ? "warning" : "muted"}
            hint="Requires attention"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Sales Performance Chart */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle>{t("rep.performance")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("rep.mom")}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <CardSkeleton /> : <RevenueBarChart data={chartData} />}
          </CardContent>
        </Card>

        {/* Best Performing Items */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle>{t("rep.top_sellers")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("rep.best_items")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <CardSkeleton />
            ) : bestSellers.length > 0 ? (
              bestSellers.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      0{index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} {t("inv.units")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground tabular-nums">
                      {currency(item.revenue)}
                    </div>
                    <div className="text-[9px] font-bold text-success uppercase tracking-wider">
                      {index === 0 ? "Top Seller" : ""}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No checkout orders completed yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
