import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownUp, Filter, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/shared/Skeletons";
import { StatusPill } from "@/components/shared/StatusPill";
import { api } from "@/services/api/client";
import { queryKeys } from "@/services/api/queryKeys";
import { currency, formatTime } from "@/lib/format";
import type { OrderStatus } from "@/services/api/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings";

export const Route = createFileRoute("/_app/orders")({
  head: () => ({ meta: [{ title: "Orders — InventoryPro" }] }),
  component: OrdersPage,
});

const STATUS_VARIANTS: Record<OrderStatus, "success" | "warning" | "destructive" | "info"> = {
  completed: "success",
  preparing: "warning",
  pending: "warning",
  ready: "info",
  cancelled: "destructive",
};

const TABS: ("all" | OrderStatus)[] = ["all", "pending", "preparing", "ready", "completed", "cancelled"];

function OrdersPage() {
  const { t, language } = useTranslation();
  const { userRole } = useSettingsStore();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.orders, queryFn: api.listOrders });
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return (data ?? []).filter(
      (o) =>
        (tab === "all" || o.status === tab) &&
        (q.length === 0 ||
          o.number.toLowerCase().includes(q.toLowerCase()) ||
          (o.customerName ?? "").toLowerCase().includes(q.toLowerCase())),
    );
  }, [data, tab, q]);

  // Translate tab buttons
  const getTabLabel = (tabName: string) => {
    if (tabName === "all") return language === "km" ? "ទាំងអស់" : "All";
    if (tabName === "pending") return t("checkout.pending");
    if (tabName === "completed") return t("checkout.paid");
    return tabName;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.orders")}
        description={language === "km" ? "គ្រប់គ្រង និងតាមដានរាល់ការលក់ចេញរបស់អ្នក។" : "Manage incoming, in-progress, and completed orders."}
        actions={
          userRole !== "cashier" && (
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          )
        }
      />

      <Card className="overflow-hidden shadow-sm border">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4 bg-muted/20">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all duration-200",
                  tab === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background border border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                {getTabLabel(t)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              placeholder={language === "km" ? "ស្វែងរកការបញ្ជាទិញ..." : "Search orders…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-56"
            />
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 h-4 w-4" /> {language === "km" ? "តម្រង" : "Filters"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Total Bill</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-border transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-semibold font-mono text-primary">{o.number}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{o.customerName ?? "Walk-in"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.items.reduce((sum, i) => sum + i.quantity, 0)} {language === "km" ? "មុខទំនិញ" : "items"}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-bold text-foreground">{currency(o.total)}</td>
                    <td className="px-4 py-3">
                      <StatusPill variant={STATUS_VARIANTS[o.status]} className="capitalize">
                        {o.status === "completed" ? (language === "km" ? "បង់រួច" : "Completed") : 
                         o.status === "pending" ? (language === "km" ? "មិនទាន់បង់" : "Pending") : o.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">{formatTime(o.createdAt)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
