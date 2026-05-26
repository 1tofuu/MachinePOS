import { create } from "zustand";
import type { Product } from "@/services/api/types";

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  add: (product) =>
    set((s) => {
      const existing = s.lines.find((l) => l.product.id === product.id);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return { lines: [...s.lines, { product, quantity: 1 }] };
    }),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.product.id !== id) })),
  setQty: (id, qty) =>
    set((s) => ({
      lines:
        qty <= 0
          ? s.lines.filter((l) => l.product.id !== id)
          : s.lines.map((l) => (l.product.id === id ? { ...l, quantity: qty } : l)),
    })),
  clear: () => set({ lines: [] }),
  subtotal: () => get().lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
  tax: () => 0,
  total: () => get().subtotal(),
}));
