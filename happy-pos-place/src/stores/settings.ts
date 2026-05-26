import { create } from "zustand";
import { persist } from "zustand/middleware";
import { db } from "@/lib/db";

export type Language = "en" | "km";
export type CurrencyMode = "USD" | "KHR" | "BOTH";
export type UserRole = "admin" | "manager" | "cashier";

interface SettingsState {
  language: Language;
  currencyMode: CurrencyMode;
  exchangeRate: number;
  userRole: UserRole;
  offlineMode: boolean;
  storeName: string;
  storeAddress: string;
  printerIp: string;
  setLanguage: (lang: Language) => void;
  setCurrencyMode: (mode: CurrencyMode) => void;
  setExchangeRate: (rate: number) => void;
  setUserRole: (role: UserRole) => void;
  setOfflineMode: (offline: boolean) => void;
  updateStoreDetails: (name: string, address: string, printerIp: string) => void;
  backupData: () => void;
  restoreData: (jsonString: string) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: "en",
      currencyMode: "BOTH",
      exchangeRate: 4100,
      userRole: "admin",
      offlineMode: false,
      storeName: "InventoryPro Flagship",
      storeAddress: "721 Enterprise Way, Silicon Valley, CA 94025",
      printerIp: "192.168.1.150",

      setLanguage: (language) => {
        set({ language });
        const dbSettings = db.getSettings();
        db.saveSettings({ ...dbSettings, language });
      },
      setCurrencyMode: (currencyMode) => {
        set({ currencyMode });
        const dbSettings = db.getSettings();
        db.saveSettings({ ...dbSettings, currencyMode });
      },
      setExchangeRate: (exchangeRate) => {
        set({ exchangeRate });
        const dbSettings = db.getSettings();
        db.saveSettings({ ...dbSettings, exchangeRate });
      },
      setUserRole: (userRole) => {
        set({ userRole });
      },
      setOfflineMode: (offlineMode) => {
        set({ offlineMode });
      },
      updateStoreDetails: (storeName, storeAddress, printerIp) => {
        set({ storeName, storeAddress, printerIp });
        const dbSettings = db.getSettings();
        db.saveSettings({
          ...dbSettings,
          storeName,
          storeAddress,
          printerIp,
        });
      },
      backupData: () => {
        const data = {
          products: localStorage.getItem("ip_products"),
          orders: localStorage.getItem("ip_orders"),
          customers: localStorage.getItem("ip_customers"),
          staff: localStorage.getItem("ip_staff"),
          settings: localStorage.getItem("ip_settings"),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventorypro-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      restoreData: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          if (data.products) localStorage.setItem("ip_products", data.products);
          if (data.orders) localStorage.setItem("ip_orders", data.orders);
          if (data.customers) localStorage.setItem("ip_customers", data.customers);
          if (data.staff) localStorage.setItem("ip_staff", data.staff);
          if (data.settings) {
            localStorage.setItem("ip_settings", data.settings);
            const parsed = JSON.parse(data.settings);
            set({
              language: parsed.language || "en",
              currencyMode: parsed.currencyMode || "BOTH",
              exchangeRate: parsed.exchangeRate || 4100,
              storeName: parsed.storeName || "InventoryPro Flagship",
              storeAddress: parsed.storeAddress || "721 Enterprise Way, Silicon Valley, CA 94025",
              printerIp: parsed.printerIp || "192.168.1.150",
            });
          }
          return true;
        } catch (e) {
          console.error("Failed to restore backup:", e);
          return false;
        }
      },
    }),
    {
      name: "ip-settings-store",
    }
  )
);
