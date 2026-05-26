import { useSettingsStore } from "@/stores/settings";

export const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const formatKHR = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ៛";

export const currency = (n: number, forceCode?: "USD" | "KHR") => {
  // Use try/catch in case store is not yet initialized in some server contexts
  try {
    const { currencyMode, exchangeRate } = useSettingsStore.getState();
    const usd = n;
    const khr = n * exchangeRate;

    if (forceCode === "USD") return formatUSD(usd);
    if (forceCode === "KHR") return formatKHR(khr);

    switch (currencyMode) {
      case "USD":
        return formatUSD(usd);
      case "KHR":
        return formatKHR(khr);
      case "BOTH":
      default:
        return `${formatUSD(usd)} / ${formatKHR(khr)}`;
    }
  } catch {
    return formatUSD(n);
  }
};

export const compactNumber = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    typeof d === "string" ? new Date(d) : d,
  );

export const formatTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
