import { createFileRoute } from "@tanstack/react-router";
import { Printer, Store, Database, Upload, Download, Globe, ShieldAlert } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth";
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore, Language, CurrencyMode, UserRole } from "@/stores/settings";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — InventoryPro" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, language } = useTranslation();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);

  // Store Settings state
  const settings = useSettingsStore();
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);
  const [printerIp, setPrinterIp] = useState(settings.printerIp);
  const [exchangeRateInput, setExchangeRateInput] = useState(settings.exchangeRate.toString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveStoreSettings = () => {
    const rate = parseFloat(exchangeRateInput) || 4100;
    settings.setExchangeRate(rate);
    settings.updateStoreDetails(storeName, storeAddress, printerIp);
    toast.success("Store configuration saved successfully!");
  };

  const handleBackup = () => {
    try {
      settings.backupData();
      toast.success("Backup downloaded successfully!");
    } catch {
      toast.error("Failed to generate backup");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const success = settings.restoreData(result);
      if (success) {
        toast.success("Data database restored successfully! Reloading...");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        toast.error("Invalid backup file format");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title={t("set.title")} description={t("set.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Store Config */}
        <Card className="lg:col-span-2 shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Store className="h-5 w-5 text-primary" /> {t("set.store_config")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="store-name">{t("set.store_name")}</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("set.currency")}</Label>
              <Select
                value={settings.currencyMode}
                onValueChange={(val: CurrencyMode) => settings.setCurrencyMode(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD Only ($)</SelectItem>
                  <SelectItem value="KHR">KHR Only (៛)</SelectItem>
                  <SelectItem value="BOTH">Dual Pricing (USD / KHR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="store-address">{t("set.store_address")}</Label>
              <Input
                id="store-address"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exchange-rate">{t("set.rate_label")}</Label>
              <Input
                id="exchange-rate"
                type="number"
                value={exchangeRateInput}
                onChange={(e) => setExchangeRateInput(e.target.value)}
                placeholder="4100"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("set.timezone")}</Label>
              <Select defaultValue="utc">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ict">Indochina Time (GMT+07:00) Phnom Penh</SelectItem>
                  <SelectItem value="pst">Pacific Time (GMT-08:00)</SelectItem>
                  <SelectItem value="utc">Coordinated Universal Time (UTC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 pt-2">
              <Button onClick={handleSaveStoreSettings}>{t("set.save_store")}</Button>
            </div>
          </CardContent>
        </Card>

        {/* User Role Management */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldAlert className="h-5 w-5 text-primary" /> {t("set.user_role")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("set.user_role")}</Label>
              <Select
                value={settings.userRole}
                onValueChange={(val: UserRole) => {
                  settings.setUserRole(val);
                  toast.success(`Role changed to ${val.toUpperCase()}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Full Control)</SelectItem>
                  <SelectItem value="manager">Manager (Operations)</SelectItem>
                  <SelectItem value="cashier">Staff / Cashier (Read-only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground pt-1">{t("set.role_desc")}</p>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {settings.userRole === "admin" ? "AR" : settings.userRole === "manager" ? "JD" : "SC"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-bold">
                    {settings.userRole === "admin" ? "Alex Rivera" : settings.userRole === "manager" ? "Jordan Doe" : "Sarah Chen"}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Active Session: {settings.userRole}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hardware Setup */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Printer className="h-5 w-5 text-primary" /> {t("set.hardware")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure your network receipt printer IP address.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="printer-ip">{t("set.printer_ip")}</Label>
                <Input
                  id="printer-ip"
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                />
              </div>
              <span className="mb-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-500">
                ONLINE
              </span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => toast.success("Receipt test printed successfully!")}>
              <Printer className="mr-2 h-4 w-4" /> {t("set.test_print")}
            </Button>
          </CardContent>
        </Card>

        {/* Data Backup & Restore */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Database className="h-5 w-5 text-primary" /> {t("set.backup_restore")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("set.backup_desc")}</p>
              <Button onClick={handleBackup} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" /> {t("set.backup_btn")}
              </Button>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs text-muted-foreground">{t("set.restore_desc")}</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleRestore}
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
                <Upload className="mr-2 h-4 w-4" /> {t("set.restore_btn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Preference */}
        <Card className="lg:col-span-2 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base font-bold">{t("set.appearance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Toggle */}
            <Toggle
              label={t("set.dark_mode")}
              description={t("set.dark_mode_desc")}
              checked={theme === "dark"}
              onChange={(v) => setTheme(v ? "dark" : "light")}
            />

            {/* Language Selector */}
            <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/5">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Language / ភាសា
                </div>
                <div className="text-xs text-muted-foreground">Select active localized strings</div>
              </div>
              <Select
                value={settings.language}
                onValueChange={(val: Language) => settings.setLanguage(val)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="km">ភាសាខ្មែរ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Offline Mode Toggle */}
            <Toggle
              label="Simulate Offline Mode"
              description="Test transaction handling and stock level syncing under offline scenarios."
              checked={settings.offlineMode}
              onChange={(v) => {
                settings.setOfflineMode(v);
                toast.info(`Offline Mode ${v ? "Enabled" : "Disabled"}`);
              }}
            />

            <Toggle label={t("set.email_receipt")} description={t("set.email_receipt_desc")} defaultChecked />
            <Toggle label={t("set.low_alerts")} description={t("set.low_alerts_desc")} defaultChecked />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
}: {
  label: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted/10 transition-colors">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch checked={checked} defaultChecked={defaultChecked} onCheckedChange={onChange} />
    </div>
  );
}
