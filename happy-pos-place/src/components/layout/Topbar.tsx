import { Bell, HelpCircle, Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { AppSidebar } from "./AppSidebar";

export function Topbar({ title, searchPlaceholder }: { title?: string; searchPlaceholder?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <AppSidebar />
        </SheetContent>
      </Sheet>

      <div className="relative hidden flex-1 md:block max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder ?? "Search…"}
          className="h-10 rounded-full border-border bg-card pl-10"
        />
      </div>

      {title && (
        <div className="hidden text-sm font-medium text-muted-foreground md:block">{title}</div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-full"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" aria-label="Notifications" className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Help" className="rounded-full">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
