import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Boxes,
  UserCog,
  FileBarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "sonner";

type NavItem = { to: string; labelKey: string; icon: typeof ShoppingCart; exact?: boolean };

const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.reports", icon: LayoutDashboard, exact: true }, // Map index to Dashboard/Analytics
  { to: "/pos", labelKey: "nav.pos", icon: ShoppingCart },
  { to: "/orders", labelKey: "nav.orders", icon: ClipboardList },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { to: "/staff", labelKey: "nav.staff", icon: UserCog },
  { to: "/reports", labelKey: "nav.reports", icon: FileBarChart2 }, // Keeps Reports separate if they want, or we can unify them
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, language } = useTranslation();
  const { userRole, setUserRole } = useSettingsStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || (to !== "/" && pathname.startsWith(to + "/"));

  // Role-based navigation filtering:
  // Cashiers only see POS, Orders, Inventory
  const filteredNavItems = navItems.filter((item) => {
    if (userRole === "cashier") {
      return item.to === "/pos" || item.to === "/orders" || item.to === "/inventory";
    }
    // Remove duplicate Reports if we map "/" to Dashboard
    if (item.to === "/reports") return false; // Dashboard "/" replaces reports
    return true;
  });

  const getRoleLabel = (role: string) => {
    if (role === "admin") return "Admin";
    if (role === "manager") return "Manager";
    return language === "km" ? "អ្នកគិតលុយ (Staff)" : "Cashier";
  };

  const getProfileName = () => {
    if (user) return user.name;
    if (userRole === "admin") return "Pan Bunheng";
    if (userRole === "manager") return "Jordan Doe";
    return "Sarah Chen";
  };

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/10">
          <Boxes className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold text-sidebar-primary tracking-wide">InventoryPro</div>
          <div className="text-xs text-sidebar-foreground/50 font-medium">Enterprise Hub</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin space-y-1">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            
            // Adjust label keys
            let label = "";
            if (item.to === "/") {
              label = language === "km" ? "ផ្ទាំងគ្រប់គ្រង" : "Dashboard";
            } else {
              label = t(item.labelKey as any);
            }

            return (
              <li key={item.to}>
                <Link
                  to={item.to as any}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200",
                    active
                      ? "text-sidebar-primary font-bold bg-sidebar-accent/40"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{label}</span>
                  {active && (
                    <span className="absolute right-0 top-1/2 z-10 h-7 w-1 -translate-y-1/2 rounded-l-full bg-sidebar-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/10">
        <div className="flex items-center gap-3 rounded-md px-1 py-1">
          <Avatar className="h-9 w-9 border border-sidebar-primary/20 shadow-sm">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-primary font-bold text-xs">
              {getProfileName().split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-bold text-sidebar-foreground">
              {getProfileName()}
            </div>
            <div className="flex">
              <select
                value={userRole}
                onChange={(e) => {
                  const newRole = e.target.value as any;
                  setUserRole(newRole);
                  toast.success(language === "km" ? `បានប្តូរតួនាទីទៅជា ${newRole}` : `Role changed to ${newRole}`);
                }}
                className="bg-transparent text-[10px] font-semibold text-sidebar-foreground/50 tracking-wider uppercase mt-0.5 border border-sidebar-border/40 rounded px-1 py-0.5 cursor-pointer outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
              >
                <option value="admin" className="bg-sidebar text-sidebar-foreground">Admin</option>
                <option value="manager" className="bg-sidebar text-sidebar-foreground">Manager</option>
                <option value="cashier" className="bg-sidebar text-sidebar-foreground">Cashier</option>
              </select>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-destructive hover:scale-105 transition-all shrink-0"
            onClick={() => {
              signOut();
              navigate({ to: "/auth" });
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
