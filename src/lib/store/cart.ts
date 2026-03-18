import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types/store";

type CartState = {
  items: CartItem[];
  addItem: (product: Product, variantId: string, qty?: number) => string | null;
  updateQty: (variantId: string, delta: number, getStock?: (variantId: string) => number) => string | null;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variantId, qty = 1) => {
        const variant = product.variants.find((v) => v.id === variantId);
        if (!variant) return "Producto sin variantes disponibles";
        if (variant.stock <= 0) return "Este producto está agotado";

        const current = get().items;
        const index = current.findIndex((item) => item.variantId === variant.id);

        if (index !== -1) {
          if (current[index].qty >= variant.stock) {
            return `Solo hay ${variant.stock} unidades disponibles`;
          }
          const newQty = Math.min(current[index].qty + qty, variant.stock);
          const clone = [...current];
          clone[index] = { ...clone[index], qty: newQty };
          set({ items: clone });
          return null;
        }

        const primaryMedia = product.media?.find((m) => m.media_type === "image" && m.is_primary);
        const fallbackMedia = product.media?.find((m) => m.media_type === "image");
        const cartImage = primaryMedia?.url ?? fallbackMedia?.url ?? product.image_url ?? null;

        set({
          items: [
            ...current,
            {
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              size: variant.size,
              gender: variant.gender,
              unitPrice: variant.price_cop,
              qty,
              imageUrl: cartImage,
            },
          ],
        });
        return null;
      },

      updateQty: (variantId, delta, getStock) => {
        const current = get().items;
        let warning: string | null = null;

        const updated = current
          .map((item) => {
            if (item.variantId !== variantId) return item;
            const maxStock = getStock ? getStock(variantId) : Infinity;
            if (delta > 0 && item.qty >= maxStock) {
              warning = `Solo hay ${maxStock} unidades disponibles`;
              return item;
            }
            return { ...item, qty: Math.min(item.qty + delta, maxStock) };
          })
          .filter((item) => item.qty > 0);

        set({ items: updated });
        return warning;
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter((item) => item.variantId !== variantId) });
      },

      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: "cart:v1",
    },
  ),
);

export function useCartTotalItems() {
  return useCart((s) => s.items.reduce((sum, item) => sum + item.qty, 0));
}

export function useCartSubtotal() {
  return useCart((s) => s.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0));
}
