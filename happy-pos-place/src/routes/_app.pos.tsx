import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Minus, 
  Plus, 
  ScanLine, 
  ShoppingBag, 
  Trash2, 
  X, 
  Printer, 
  Share2, 
  Coins, 
  QrCode, 
  CreditCard, 
  ArrowLeftRight, 
  CheckCircle,
  WifiOff,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/shared/Skeletons";
import { api } from "@/services/api/client";
import { queryKeys } from "@/services/api/queryKeys";
import { useCartStore } from "@/stores/cart";
import { currency, formatUSD, formatKHR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/pos")({
  head: () => ({ meta: [{ title: "POS Terminal — InventoryPro" }] }),
  component: PosPage,
});

type PaymentType = "cash" | "card" | "qr" | "transfer";

function PosPage() {
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const { exchangeRate, currencyMode, offlineMode, storeName, storeAddress } = useSettingsStore();

  const { data: products, isLoading } = useQuery({
    queryKey: queryKeys.products,
    queryFn: api.listProducts,
  });

  const [activeCat, setActiveCat] = useState<string>("All Products");
  const [query, setQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>("cash");
  const [cashReceivedUSD, setCashReceivedUSD] = useState<string>("");
  const [cashReceivedKHR, setCashReceivedKHR] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"completed" | "pending">("completed");
  const [customerName, setCustomerName] = useState("");
  
  // Post-checkout Receipt State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);

  const cart = useCartStore();

  // Dynamic category extraction
  const categories = ["All Products", ...new Set((products ?? []).map((p) => p.category))];

  // Barcode keyboard listener for physical scanners
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore input elements to avoid capturing user text typing
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const currentTime = Date.now();
      
      // Scanners transmit text extremely fast, usually < 50ms per key
      if (currentTime - lastKeyTime > 60) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.trim().length > 1) {
          const skuMatch = products?.find(
            (p) => p.sku.toLowerCase() === buffer.trim().toLowerCase()
          );
          if (skuMatch) {
            if (skuMatch.stock <= 0) {
              toast.error(t("pos.out_of_stock") + `: ${skuMatch.name}`);
            } else {
              cart.add(skuMatch);
              toast.success(`Scanned: ${skuMatch.name}`);
            }
          } else {
            toast.error(`Unknown barcode: ${buffer}`);
          }
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart, t]);

  const handleManualBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products?.find(
      (p) => p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      if (matched.stock <= 0) {
        toast.error(t("pos.out_of_stock") + `: ${matched.name}`);
      } else {
        cart.add(matched);
        toast.success(`Scanned: ${matched.name}`);
        setBarcodeInput("");
      }
    } else {
      toast.error(`No product found with barcode: ${barcodeInput}`);
    }
  };

  const filtered = (products ?? []).filter(
    (p) =>
      (activeCat === "All Products" || p.category === activeCat) &&
      (query.length === 0 ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase()))
  );

  const cartTotalUSD = cart.total();
  const cartTotalKHR = cartTotalUSD * exchangeRate;

  // Auto-change calculations
  const parsedReceivedUSD = parseFloat(cashReceivedUSD) || 0;
  const parsedReceivedKHR = parseFloat(cashReceivedKHR) || 0;
  
  const totalReceivedInUSD = parsedReceivedUSD + parsedReceivedKHR / exchangeRate;
  const changeUSD = Math.max(0, totalReceivedInUSD - cartTotalUSD);
  const changeKHR = changeUSD * exchangeRate;

  // Quick cash buttons helper
  const handleQuickCashUSD = (amount: number) => {
    setCashReceivedUSD(amount.toString());
    setCashReceivedKHR("");
  };

  const handleQuickCashKHR = (amount: number) => {
    setCashReceivedKHR(amount.toString());
    setCashReceivedUSD("");
  };

  const handleOpenCheckout = () => {
    setCashReceivedUSD("");
    setCashReceivedKHR("");
    setCustomerName("");
    setPaymentStatus("completed");
    setPaymentMethod("cash");
    setIsCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (offlineMode) {
      toast.info("Offline checkout saved locally");
    }

    const orderItems = cart.lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      quantity: l.quantity,
      unitPrice: l.product.price,
    }));

    try {
      const order = await api.createOrder({
        customerName: customerName || "Walk-in",
        items: orderItems,
        subtotal: cart.subtotal(),
        tax: 0,
        total: cartTotalUSD,
        status: paymentStatus === "completed" ? "completed" : "pending",
        payment: paymentMethod === "qr" ? "wallet" : paymentMethod === "transfer" ? "card" : paymentMethod,
      });

      setLastPlacedOrder({
        ...order,
        receivedUSD: parsedReceivedUSD,
        receivedKHR: parsedReceivedKHR,
        changeUSD: changeUSD,
        changeKHR: changeKHR,
        paymentMethod: paymentMethod,
      });

      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);

      // Invalidate products query to update stock levels instantly
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });

      toast.success(t("checkout.complete"));
    } catch {
      toast.error("Failed to complete checkout");
    }
  };

  const printReceipt = () => {
    window.print();
    toast.success(t("checkout.print_receipt"));
  };

  const shareReceipt = () => {
    if (!lastPlacedOrder) return;
    const itemsText = lastPlacedOrder.items
      .map((i: any) => `${i.name} x${i.quantity} - ${formatUSD(i.unitPrice * i.quantity)}`)
      .join("\n");
    const receiptText = `
--- ${storeName} ---
Order: ${lastPlacedOrder.number}
Date: ${new Date(lastPlacedOrder.createdAt).toLocaleString()}
Customer: ${lastPlacedOrder.customerName}
-------------------------
${itemsText}
-------------------------
Total: ${formatUSD(lastPlacedOrder.total)} / ${formatKHR(lastPlacedOrder.total * exchangeRate)}
Payment: ${lastPlacedOrder.paymentMethod.toUpperCase()} (${paymentStatus === "completed" ? "Paid" : "Pending"})
Thank you!
    `;
    
    if (navigator.share) {
      navigator.share({
        title: `Receipt ${lastPlacedOrder.number}`,
        text: receiptText,
      }).then(() => toast.success(t("checkout.receipt_sent")))
        .catch(() => {
          navigator.clipboard.writeText(receiptText);
          toast.success("Receipt copied to clipboard!");
        });
    } else {
      navigator.clipboard.writeText(receiptText);
      toast.success("Receipt copied to clipboard!");
    }
  };

  const handleFinishSale = () => {
    cart.clear();
    setIsReceiptOpen(false);
    setLastPlacedOrder(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px] relative">
      {offlineMode && (
        <div className="xl:col-span-2 bg-warning/15 border border-warning text-warning-foreground rounded-lg p-3 flex items-center gap-2 mb-2">
          <WifiOff className="h-5 w-5 shrink-0" />
          <div className="text-sm font-medium">
            Offline Mode active. All checkouts will be stored locally and stock deducted in real-time.
          </div>
        </div>
      )}

      <div className="space-y-4 min-w-0">
        <PageHeader 
          title={t("pos.title")} 
          description={t("pos.subtitle")} 
          actions={
            <form onSubmit={handleManualBarcodeScan} className="flex gap-2 w-full max-w-xs">
              <Input
                placeholder={t("pos.barcode_placeholder")}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="h-9"
              />
              <Button size="sm" type="submit" variant="secondary">
                <ScanLine className="h-4 w-4 mr-1" />
                {t("pos.barcode_btn")}
              </Button>
            </form>
          }
        />

        <div className="relative">
          <Input
            placeholder={t("pos.search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 rounded-full pl-12"
          />
          <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-thin">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                activeCat === c
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {c === "All Products" ? (language === "km" ? "ផលិតផលទាំងអស់" : c) : c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filtered.map((p) => {
                const isLowStock = p.stock <= p.reorderPoint && p.stock > 0;
                const isOutOfStock = p.stock === 0;
                
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    whileHover={{ y: isOutOfStock ? 0 : -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        "group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md border",
                        isOutOfStock && "opacity-60 cursor-not-allowed bg-muted/40",
                        isLowStock && "border-warning/50 bg-warning/5"
                      )}
                      onClick={() => {
                        if (isOutOfStock) {
                          toast.error(t("pos.out_of_stock") + `: ${p.name}`);
                          return;
                        }
                        cart.add(p);
                        // Subtle feedback
                        toast.success(`${p.name} added to cart`, { duration: 800 });
                      }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                        
                        {/* Price Badge */}
                        <span className="absolute right-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                          {currency(p.price)}
                        </span>

                        {/* Stock Badges */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge variant="destructive" className="font-bold text-sm tracking-wide px-3 py-1">
                              {t("pos.out_of_stock")}
                            </Badge>
                          </div>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <span className="absolute left-3 top-3 rounded-full bg-warning px-2.5 py-1 text-[10px] font-bold text-warning-foreground shadow-sm flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            {p.stock} left
                          </span>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                          {p.name}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[70%]">
                            {p.description || p.sku}
                          </span>
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium uppercase">
                            {p.sku.replace("SKU-", "")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart Container */}
      <aside className="xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]">
        <Card className="flex h-full flex-col border shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="font-semibold">{t("pos.current_order")}</span>
              <Badge variant="secondary" className="rounded-full">
                {cart.lines.reduce((sum, l) => sum + l.quantity, 0)}
              </Badge>
            </div>
            {cart.lines.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={cart.clear}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                {t("pos.clear_all")}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {cart.lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <ShoppingBag className="mb-3 h-10 w-10 opacity-30 animate-bounce" />
                {t("pos.empty_cart")}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.lines.map((l) => (
                  <motion.div
                    key={l.product.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    className="mb-2 flex items-center gap-3 rounded-lg bg-accent/30 p-2.5 border"
                  >
                    {l.product.imageUrl && (
                      <img
                        src={l.product.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover border"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{l.product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {currency(l.product.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5">
                      <button
                        onClick={() => cart.setQty(l.product.id, l.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-semibold">{l.quantity}</span>
                      <button
                        onClick={() => {
                          if (l.quantity >= l.product.stock) {
                            toast.error(`Only ${l.product.stock} units available in stock`);
                            return;
                          }
                          cart.setQty(l.product.id, l.quantity + 1);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="w-16 text-right text-xs font-bold tabular-nums">
                      {currency(l.product.price * l.quantity)}
                    </div>
                    <button
                      onClick={() => cart.remove(l.product.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="border-t border-border p-4 bg-muted/20">
            <div className="space-y-2 text-sm">
              <Row label={t("pos.subtotal")} value={currency(cart.subtotal())} />
              <div className="my-2 border-t border-dashed border-border" />
              <Row label={t("pos.total")} value={currency(cartTotalUSD)} bold />
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={cart.clear} 
                disabled={cart.lines.length === 0}
              >
                <X className="mr-2 h-4 w-4" /> {t("pos.cancel")}
              </Button>
              <Button 
                onClick={handleOpenCheckout} 
                disabled={cart.lines.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-[1.02] transition-transform duration-200"
              >
                {t("pos.checkout")}
              </Button>
            </div>
          </div>
        </Card>
      </aside>

      {/* ==================== CHECKOUT MODAL ==================== */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl sm:rounded-2xl border-2 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-6 text-primary-foreground">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Coins className="h-6 w-6" />
                {t("checkout.title")}
              </DialogTitle>
              <Badge variant="secondary" className="bg-background/20 border-none text-white text-base py-1 px-3">
                {t("pos.total")}: {currency(cartTotalUSD)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-sm font-semibold">
                  Customer Name
                </Label>
                <Input
                  id="customer-name"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Payment Status Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex justify-between">
                  <span>{t("checkout.payment_status")}</span>
                  <Badge variant={paymentStatus === "completed" ? "success" : "warning"}>
                    {paymentStatus === "completed" ? t("checkout.paid") : t("checkout.pending")}
                  </Badge>
                </Label>
                <div className="flex items-center space-x-2 border rounded-md p-2 bg-background h-10">
                  <span className="text-sm text-muted-foreground flex-1">Mark order as paid?</span>
                  <Switch
                    checked={paymentStatus === "completed"}
                    onCheckedChange={(checked) =>
                      setPaymentStatus(checked ? "completed" : "pending")
                    }
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t("checkout.pay_method")}</Label>
              <Tabs
                defaultValue="cash"
                onValueChange={(val) => setPaymentMethod(val as PaymentType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted rounded-xl">
                  <TabsTrigger value="cash" className="rounded-lg font-semibold flex items-center justify-center gap-1">
                    <Coins className="h-4 w-4" /> {t("checkout.cash")}
                  </TabsTrigger>
                  <TabsTrigger value="card" className="rounded-lg font-semibold flex items-center justify-center gap-1">
                    <CreditCard className="h-4 w-4" /> {t("checkout.card")}
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="rounded-lg font-semibold flex items-center justify-center gap-1">
                    <QrCode className="h-4 w-4" /> {t("checkout.qr")}
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="rounded-lg font-semibold flex items-center justify-center gap-1">
                    <ArrowLeftRight className="h-4 w-4" /> {t("checkout.transfer")}
                  </TabsTrigger>
                </TabsList>

                {/* CASH TAB */}
                <TabsContent value="cash" className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="received-usd" className="font-semibold text-sm">
                        {t("checkout.cash_received")}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="received-usd"
                          type="number"
                          placeholder="0.00"
                          value={cashReceivedUSD}
                          onChange={(e) => {
                            setCashReceivedUSD(e.target.value);
                            setCashReceivedKHR("");
                          }}
                          className="pl-8 text-lg font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {[5, 10, 20, 50, 100].map((amt) => (
                          <Button
                            key={amt}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickCashUSD(amt)}
                            className="text-xs h-8"
                          >
                            +${amt}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQuickCashUSD(Math.ceil(cartTotalUSD))}
                          className="text-xs h-8 border-primary/30"
                        >
                          Exact (${Math.ceil(cartTotalUSD)})
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="received-khr" className="font-semibold text-sm">
                        {t("checkout.cash_received_khr")}
                      </Label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">៛</span>
                        <Input
                          id="received-khr"
                          type="number"
                          placeholder="0"
                          value={cashReceivedKHR}
                          onChange={(e) => {
                            setCashReceivedKHR(e.target.value);
                            setCashReceivedUSD("");
                          }}
                          className="pr-8 text-lg font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {[10000, 20000, 50000, 100000, 200000].map((amt) => (
                          <Button
                            key={amt}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickCashKHR(amt)}
                            className="text-xs h-8"
                          >
                            +{new Intl.NumberFormat().format(amt)}៛
                          </Button>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQuickCashKHR(Math.ceil(cartTotalKHR / 5000) * 5000)}
                          className="text-xs h-8 border-primary/30"
                        >
                          Exact ({new Intl.NumberFormat().format(Math.ceil(cartTotalKHR / 5000) * 5000)}៛)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Change Calculation Area */}
                  <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">{t("checkout.change")}</span>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary tabular-nums">
                          {formatUSD(changeUSD)}
                        </div>
                        <div className="text-sm font-semibold text-muted-foreground tabular-nums">
                          {formatKHR(changeKHR)}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* CARD TAB */}
                <TabsContent value="card" className="mt-4 p-4 rounded-xl border border-dashed text-center space-y-2">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="font-semibold">Tap or Insert Credit Card</p>
                  <p className="text-xs text-muted-foreground">Compatible with Visa, Mastercard, UnionPay, and localized smart cards.</p>
                </TabsContent>

                {/* QR PAY TAB */}
                <TabsContent value="qr" className="mt-4 space-y-4">
                  <div className="grid gap-6 md:grid-cols-[1fr_160px] items-center">
                    <div className="space-y-2">
                      <Badge className="bg-[#e11d48] text-white hover:bg-[#be123c]">
                        {t("checkout.aba_pay")}
                      </Badge>
                      <h4 className="font-bold text-base">KHQR Cambodia Unified Code</h4>
                      <p className="text-xs text-muted-foreground">
                        {t("checkout.qr_scan")} using ABA Mobile, Bakong App, or any Cambodian bank application.
                      </p>
                      <div className="text-sm font-bold text-primary mt-2">
                        Store: {storeName} <br />
                        Total Bill: {currency(cartTotalUSD)}
                      </div>
                    </div>
                    <div className="border p-2 rounded-lg bg-white shadow-md mx-auto flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src="/aba-qr.jpg"
                        alt="ABA Pay QR Code"
                        className="h-36 w-36 object-cover rounded"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* BANK TRANSFER TAB */}
                <TabsContent value="transfer" className="mt-4 p-4 rounded-xl border space-y-3 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-sm">{t("checkout.bank_details")}</div>
                      <div className="text-sm text-foreground/80">{t("checkout.bank_name")}</div>
                      <div className="font-mono text-sm font-semibold select-all text-primary">
                        {t("checkout.bank_number")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Please check bank transfers in real-time before clicking confirm.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="bg-muted/40 p-6 border-t gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCheckout}
              disabled={paymentMethod === "cash" && totalReceivedInUSD < cartTotalUSD && paymentStatus === "completed"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t("checkout.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== THERMAL RECEIPT MODAL ==================== */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md sm:rounded-2xl border-2 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-4 text-primary-foreground text-center">
            <DialogTitle className="text-lg font-bold">
              {t("checkout.complete")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 bg-muted/5 max-h-[70vh] overflow-y-auto">
            {/* The Thermal Receipt Preview */}
            <div className="bg-white text-black p-6 rounded shadow-inner border font-mono text-xs space-y-4 max-w-sm mx-auto shadow-md">
              <div className="text-center space-y-1 border-b pb-3 border-dashed">
                <h2 className="text-base font-bold tracking-widest">{storeName.toUpperCase()}</h2>
                <p className="text-[10px] text-gray-500">{storeAddress}</p>
                <p className="text-[10px]">Tel: +855 12 345 678</p>
              </div>

              {lastPlacedOrder && (
                <>
                  <div className="space-y-1 text-[10px] border-b pb-2 border-dashed">
                    <div className="flex justify-between">
                      <span>Receipt: {lastPlacedOrder.number}</span>
                      <span>Date: {new Date(lastPlacedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time: {new Date(lastPlacedOrder.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span>Staff: Cashier</span>
                    </div>
                    <div>Customer: {lastPlacedOrder.customerName}</div>
                  </div>

                  <table className="w-full border-b pb-2 border-dashed text-[10px]">
                    <thead>
                      <tr className="border-b border-dashed">
                        <th className="text-left font-bold py-1">Item</th>
                        <th className="text-center font-bold py-1">Qty</th>
                        <th className="text-right font-bold py-1">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastPlacedOrder.items.map((item: any, i: number) => (
                        <tr key={i} className="align-top">
                          <td className="py-1 max-w-[140px] truncate">{item.name}</td>
                          <td className="text-center py-1">{item.quantity}</td>
                          <td className="text-right py-1">{formatUSD(item.unitPrice * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="space-y-1 pt-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>SUBTOTAL:</span>
                      <span>{formatUSD(lastPlacedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm border-t border-dashed pt-1">
                      <span>TOTAL (USD):</span>
                      <span>{formatUSD(lastPlacedOrder.total)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs">
                      <span>TOTAL (KHR):</span>
                      <span>{formatKHR(lastPlacedOrder.total * exchangeRate)}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5 pt-2 border-t border-dashed text-[9px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="uppercase font-semibold">{lastPlacedOrder.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <span className="font-semibold">{lastPlacedOrder.status.toUpperCase()}</span>
                    </div>
                    {lastPlacedOrder.paymentMethod === "cash" && (
                      <>
                        <div className="flex justify-between">
                          <span>Cash USD Recd:</span>
                          <span>{formatUSD(lastPlacedOrder.receivedUSD || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cash KHR Recd:</span>
                          <span>{formatKHR(lastPlacedOrder.receivedKHR || 0)}</span>
                        </div>
                        <div className="flex justify-between text-black font-semibold border-t border-dotted mt-0.5 pt-0.5">
                          <span>Change Due:</span>
                          <span>{formatUSD(lastPlacedOrder.changeUSD || 0)} / {formatKHR(lastPlacedOrder.changeKHR || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="text-center space-y-1 pt-3 border-t border-dashed">
                <p className="font-semibold tracking-wider text-[10px]">THANK YOU FOR YOUR VISIT!</p>
                <div className="flex justify-center py-2 opacity-80">
                  {/* Mock Barcode */}
                  <div className="w-40 h-8 bg-zinc-200 flex items-center justify-between px-1 relative">
                    <div className="flex justify-around w-full h-full opacity-60">
                      {[...Array(24)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-black h-full"
                          style={{
                            width: `${(i % 3) + 1}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[8px] text-gray-500">System powered by InventoryPro</p>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/40 p-4 border-t flex flex-wrap gap-2 justify-center sm:justify-between items-center">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={printReceipt}>
                <Printer className="h-4 w-4 mr-1.5" />
                {t("checkout.print_receipt")}
              </Button>
              <Button size="sm" variant="outline" onClick={shareReceipt}>
                <Share2 className="h-4 w-4 mr-1.5" />
                {t("checkout.share_receipt")}
              </Button>
            </div>
            <Button size="sm" onClick={handleFinishSale} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4">
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("tabular-nums font-semibold", bold && "text-base text-primary")}>
        {value}
      </span>
    </div>
  );
}
