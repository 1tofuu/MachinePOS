import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Edit2, History, Plus, ScanBarcode, Trash2, Upload, AlertTriangle, Search, Info, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/shared/Skeletons";
import { StatusPill } from "@/components/shared/StatusPill";
import { Progress } from "@/components/ui/progress";
import { api } from "@/services/api/client";
import { queryKeys } from "@/services/api/queryKeys";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings";
import { currency } from "@/lib/format";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Inventory — InventoryPro" }] }),
  component: InventoryPage,
});

const DEFAULT_CATEGORIES = ["Coffee & Tea", "Pastries", "Cold Sandwiches", "Snacks", "Retail", "Beverages"];

function statusFor(stock: number, reorder: number, t: any) {
  if (stock === 0) return { label: t("inv.out_of_stock"), variant: "destructive" as const };
  if (stock <= reorder) return { label: t("inv.low_stock"), variant: "warning" as const };
  return { label: t("inv.in_stock"), variant: "success" as const };
}

function InventoryPage() {
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const { userRole } = useSettingsStore();

  const { data: products, isLoading } = useQuery({ 
    queryKey: queryKeys.products, 
    queryFn: api.listProducts 
  });
  
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [activeCat, setActiveCat] = useState("All");

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Restock states
  const [restockProductTarget, setRestockProductTarget] = useState<any>(null);
  const [restockAmount, setRestockAmount] = useState("10");
  const [isRestockSubmitting, setIsRestockSubmitting] = useState(false);
  
  // Product Form Fields
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formReorder, setFormReorder] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageBase64, setFormImageBase64] = useState("");

  // Delete Alert States
  const [deleteProductTarget, setDeleteProductTarget] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic category calculations
  const categories = ["All", ...DEFAULT_CATEGORIES];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImageBase64(reader.result as string);
      toast.success("Image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    if (userRole === "cashier") {
      toast.error("Only Admins and Managers can add products");
      return;
    }
    setEditingProduct(null);
    setFormName("");
    setFormSku("SKU-" + Math.floor(1000 + Math.random() * 9000));
    setFormPrice("");
    setFormCost("");
    setFormCategory("Coffee & Tea");
    setFormStock("100");
    setFormReorder("20");
    setFormDescription("");
    setFormImageBase64("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    if (userRole === "cashier") {
      toast.error("Only Admins and Managers can edit products");
      return;
    }
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormPrice(product.price.toString());
    setFormCost(product.cost?.toString() || "");
    setFormCategory(product.category);
    setFormStock(product.stock.toString());
    setFormReorder(product.reorderPoint.toString());
    setFormDescription(product.description || "");
    setFormImageBase64(product.imageUrl || "");
    setIsFormOpen(true);
  };

  const handleOpenRestock = (product: any) => {
    if (userRole === "cashier") {
      toast.error("Only Admins and Managers can restock products");
      return;
    }
    setRestockProductTarget(product);
    setRestockAmount("10");
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductTarget) return;

    const amount = parseInt(restockAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive stock quantity.");
      return;
    }

    setIsRestockSubmitting(true);

    try {
      const updatedProduct = {
        ...restockProductTarget,
        stock: restockProductTarget.stock + amount,
      };

      await api.updateProduct(updatedProduct);
      toast.success(`Successfully added ${amount} units to "${restockProductTarget.name}".`);
      setRestockProductTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    } catch {
      toast.error("Failed to update product stock.");
    } finally {
      setIsRestockSubmitting(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formSku.trim() || !formPrice.trim() || !formCost.trim() || !formStock.trim()) {
      toast.error(t("inv.fields_required"));
      return;
    }

    const sellingPrice = parseFloat(formPrice);
    const costPrice = parseFloat(formCost);
    if (Number.isNaN(sellingPrice) || sellingPrice <= 0) {
      toast.error("Selling price must be greater than 0.");
      return;
    }
    if (Number.isNaN(costPrice) || costPrice < 0) {
      toast.error("Principal cost must be 0 or greater.");
      return;
    }

    // Name uniqueness validation
    const lowerName = formName.trim().toLowerCase();
    const isDuplicate = (products ?? []).some(
      (p) => 
        p.name.toLowerCase() === lowerName && 
        (!editingProduct || p.id !== editingProduct.id)
    );

    if (isDuplicate) {
      toast.error(t("inv.name_exists"));
      return;
    }

    const payload = {
      name: formName.trim(),
      sku: formSku.trim(),
      price: sellingPrice,
      cost: costPrice,
      category: formCategory as any,
      stock: parseInt(formStock, 10) || 0,
      reorderPoint: parseInt(formReorder, 10) || 0,
      description: formDescription.trim(),
      imageUrl: formImageBase64,
      isActive: true,
    };

    try {
      if (editingProduct) {
        await api.updateProduct({
          ...editingProduct,
          ...payload,
        });
        toast.success("Product updated successfully!");
      } else {
        await api.createProduct(payload);
        toast.success("New product added successfully!");
      }

      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    } catch {
      toast.error("An error occurred while saving the product");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteProductTarget) return;

    try {
      await api.deleteProduct(deleteProductTarget.id);
      toast.success(`Product "${deleteProductTarget.name}" deleted`);
      setDeleteProductTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    } catch {
      toast.error("Failed to delete product");
    }
  };

  // Filtered rows
  const rows = (products ?? []).filter(
    (p) =>
      (activeCat === "All" || p.category === activeCat) &&
      (!lowOnly || p.stock <= p.reorderPoint) &&
      (q.length === 0 ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.sku.toLowerCase().includes(q.toLowerCase()))
  );

  const lowStockCount = (products ?? []).filter((p) => p.stock <= p.reorderPoint).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("inv.title")}
        description={t("inv.subtitle")}
        actions={
          userRole !== "cashier" && (
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" /> {t("inv.new_item")}
            </Button>
          )
        }
      />

      {/* Low Stock Banner Alert */}
      {lowStockCount > 0 && (
        <Card className="bg-warning/10 border-2 border-warning/30 text-warning-foreground overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-warning-foreground shrink-0 animate-bounce" />
            <div className="flex-1">
              <span className="font-bold">Attention Required:</span> {lowStockCount} items are running low on stock. Please review levels and place purchase orders.
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden shadow-sm border">
        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-4 border-b border-border p-4 bg-muted/20">
          <div className="relative w-64 max-w-full">
            <Input
              placeholder={t("inv.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 pl-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          
          <div className="flex flex-wrap gap-1.5 items-center">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  activeCat === c
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {c === "All" ? (language === "km" ? "ទាំងអស់" : c) : c}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <Button
              size="sm"
              variant={lowOnly ? "default" : "outline"}
              onClick={() => setLowOnly((v) => !v)}
              className="font-semibold"
            >
              <ScanBarcode className="mr-1.5 h-4 w-4" /> 
              {t("inv.low_stock")} ({lowStockCount})
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
                  <th className="px-4 py-3 text-left">{t("inv.col_product")}</th>
                  <th className="px-4 py-3 text-left">{t("inv.col_sku")}</th>
                  <th className="px-4 py-3 text-left">{t("inv.col_stock")}</th>
                  <th className="px-4 py-3 text-left">{t("inv.col_status")}</th>
                  <th className="px-4 py-3 text-right">{t("inv.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const s = statusFor(p.stock, p.reorderPoint, t);
                  const max = Math.max(p.stock, p.reorderPoint * 3);
                  const pct = max > 0 ? (p.stock / max) * 100 : 0;
                  
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-10 w-10 rounded-md object-cover border bg-muted"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted border flex items-center justify-center text-muted-foreground">
                              <Plus className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{p.sku}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1.5 max-w-[160px]">
                          <div
                            className={cn(
                              "text-xs tabular-nums font-semibold",
                              p.stock === 0 && "text-destructive",
                              p.stock > 0 && p.stock <= p.reorderPoint && "text-warning-foreground",
                            )}
                          >
                            {p.stock} / {Math.max(p.reorderPoint * 3, p.stock)} {t("inv.units")}
                          </div>
                          <Progress 
                            value={pct} 
                            className="h-1.5" 
                            indicatorClassName={cn(
                              p.stock === 0 && "bg-destructive",
                              p.stock > 0 && p.stock <= p.reorderPoint && "bg-warning"
                            )}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill variant={s.variant}>{s.label}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          {userRole !== "cashier" ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-2 text-xs font-semibold mr-1"
                                onClick={() => handleOpenRestock(p)}
                                aria-label="Restock"
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" /> Restock
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleOpenEdit(p)}
                                aria-label="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteProductTarget(p)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded">
                              <Info className="h-3.5 w-3.5" /> View Only
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ==================== CREATE / EDIT PRODUCT DIALOG ==================== */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg sm:rounded-2xl border-2 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-5 text-primary-foreground">
            <DialogTitle className="text-lg font-bold">
              {editingProduct ? t("inv.edit_product") : t("inv.add_product")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Product Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-name" className="font-semibold text-xs">
                  {t("inv.prod_name")} *
                </Label>
                <Input
                  id="prod-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Traditional Khmer Iced Coffee"
                  required
                />
              </div>

              {/* SKU / Barcode */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-sku" className="font-semibold text-xs">
                  {t("inv.prod_sku")} *
                </Label>
                <Input
                  id="prod-sku"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="e.g. SKU-1001"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">{t("inv.prod_category")} *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger id="prod-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-price" className="font-semibold text-xs">
                  {t("inv.prod_price")} *
                </Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Customer selling price used at checkout.</p>
              </div>

              {/* Cost */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-cost" className="font-semibold text-xs">
                  {t("inv.prod_cost")} *
                </Label>
                <Input
                  id="prod-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Your principal cost. Profit uses selling price minus this cost.</p>
              </div>

              {/* Initial Stock */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-stock" className="font-semibold text-xs">
                  {t("inv.prod_stock")} *
                </Label>
                <Input
                  id="prod-stock"
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              {/* Reorder Point */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-reorder" className="font-semibold text-xs">
                  {t("inv.prod_reorder")} *
                </Label>
                <Input
                  id="prod-reorder"
                  type="number"
                  value={formReorder}
                  onChange={(e) => setFormReorder(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-description" className="font-semibold text-xs">
                  {t("inv.prod_description")}
                </Label>
                <Textarea
                  id="prod-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short product overview..."
                  rows={2}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-semibold text-xs">{t("inv.prod_image")}</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center min-h-[100px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {formImageBase64 ? (
                    <div className="relative w-full max-w-[120px] aspect-square rounded-md overflow-hidden border">
                      <img src={formImageBase64} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormImageBase64("");
                        }}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                      <span className="text-xs text-muted-foreground">{t("inv.prod_image_upload")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRMATION DIALOG ==================== */}
      <AlertDialog open={!!deleteProductTarget} onOpenChange={(open) => !open && setDeleteProductTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              {t("inv.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t("inv.delete_confirm")}
              <div className="mt-3 p-3 bg-muted rounded-xl border font-semibold text-foreground flex items-center gap-3">
                {deleteProductTarget?.imageUrl && (
                  <img src={deleteProductTarget.imageUrl} alt="" className="h-10 w-10 object-cover rounded-md border" />
                )}
                <div>
                  <div>{deleteProductTarget?.name}</div>
                  <div className="text-xs text-muted-foreground">{deleteProductTarget?.sku}</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== RESTOCK PRODUCT DIALOG ==================== */}
      <Dialog open={!!restockProductTarget} onOpenChange={(open) => !open && setRestockProductTarget(null)}>
        <DialogContent className="max-w-sm sm:rounded-2xl border-2 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-5 text-primary-foreground">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Restock Product
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmRestock} className="p-6 space-y-4">
            {restockProductTarget && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-xl border">
                  <div className="text-sm font-bold text-foreground">{restockProductTarget.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">SKU: {restockProductTarget.sku}</div>
                  <div className="text-xs font-semibold text-primary mt-2">
                    Current Stock: {restockProductTarget.stock} units
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="restock-quantity" className="font-semibold text-xs">
                    Quantity to Add *
                  </Label>
                  <Input
                    id="restock-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setRestockProductTarget(null)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isRestockSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
              >
                {isRestockSubmitting ? "Updating..." : "Add Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
