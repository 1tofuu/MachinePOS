import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, FileDown, PackageCheck, ShoppingCart, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton, StatGridSkeleton } from "@/components/shared/Skeletons";
import { RevenueBarChart } from "@/components/shared/Charts";
import { api } from "@/services/api/client";
import { queryKeys } from "@/services/api/queryKeys";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — InventoryPro" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const { data: monthlyRevenue, isLoading: loadingRevenue } = useQuery({
    queryKey: queryKeys.revenueMonthly,
    queryFn: api.revenueMonthly,
  });
  const { data: weeklyRevenue, isLoading: loadingWeekly } = useQuery({
    queryKey: queryKeys.revenueWeekly,
    queryFn: api.revenueWeekly,
  });
  const { data: dailySales, isLoading: loadingDaily } = useQuery({
    queryKey: queryKeys.salesDaily(today),
    queryFn: () => api.salesDaily(today),
  });
  const { data: monthlySales, isLoading: loadingMonthly } = useQuery({
    queryKey: queryKeys.salesMonthly(currentMonth),
    queryFn: () => api.salesMonthly(currentMonth),
  });

  const isLoading = loadingRevenue || loadingWeekly || loadingDaily || loadingMonthly;
  const weeklyTotal = (weeklyRevenue ?? []).reduce((sum, point) => sum + point.current, 0);
  const topSellers = monthlySales?.topSellers ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Detailed financial and operational reports."
        actions={
          <>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" /> {currentMonth}
            </Button>
            <Button>
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {isLoading ? (
        <StatGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Sales Amount" value={currency(monthlySales?.revenue ?? 0)} icon={TrendingUp} tone="success" hint={`${monthlySales?.orderCount ?? 0} completed orders`} />
          <StatCard label="Principal Cost" value={currency(monthlySales?.cost ?? 0)} icon={ShoppingCart} hint="Cost of sold items" />
          <StatCard label="Gross Profit" value={currency(monthlySales?.profit ?? 0)} icon={DollarSign} hint={`${monthlySales?.profitMargin ?? 0}% margin`} />
          <StatCard label="Today Sales" value={currency(dailySales?.revenue ?? 0)} icon={PackageCheck} hint={`${dailySales?.itemsSold ?? 0} items sold today`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Performance</CardTitle>
            <p className="text-sm text-muted-foreground">Month-over-month revenue from completed orders</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <CardSkeleton /> : <RevenueBarChart data={monthlyRevenue ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sellers</CardTitle>
            <p className="text-sm text-muted-foreground">Best performing items this month</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSellers.slice(0, 4).map((p, i) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                    0{i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.units} Units Sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{currency(p.revenue)}</div>
                  {i === 0 && (
                    <div className="text-[10px] font-medium uppercase tracking-wider text-success">
                      Top
                    </div>
                  )}
                </div>
              </div>
            ))}
            {topSellers.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No completed sales for this month yet.
              </div>
            )}
            <Button variant="ghost" className="mt-2 w-full text-primary">
              View Full Inventory Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
