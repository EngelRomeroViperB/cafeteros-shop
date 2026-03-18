"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { formatCOP } from "@/lib/format";
import { useCart, useCartSubtotal, useCartTotalItems } from "@/lib/store/cart";
import type { Product } from "@/types/store";

type Props = {
  open: boolean;
  onClose: () => void;
  onGoHome: () => void;
  onCheckout: () => void;
  checkingOut: boolean;
  userEmail: string | null;
  products: Product[];
};

export default function CartDrawer({
  open,
  onClose,
  onGoHome,
  onCheckout,
  checkingOut,
  userEmail,
  products,
}: Props) {
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const removeItem = useCart((s) => s.removeItem);
  const totalItems = useCartTotalItems();
  const subtotal = useCartSubtotal();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Get stock for a variant from products prop
  const getStock = (variantId: string): number => {
    for (const p of products) {
      const v = p.variants.find((v) => v.id === variantId);
      if (v) return v.stock;
    }
    return Infinity;
  };

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Carrito de compras"
        className={`fixed top-0 right-0 z-[80] h-full w-full sm:w-[420px] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-display text-lg font-bold text-dark-bg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-col-blue" />
            Tu Carrito
            {totalItems > 0 && (
              <span className="bg-col-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Cerrar carrito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" id="cart-container">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h3>
              <p className="text-gray-500 mb-6">¡Agrega la nueva piel y prepárate para el partido!</p>
              <button
                onClick={() => {
                  onGoHome();
                  onClose();
                }}
                className="bg-col-blue text-white px-6 py-3 rounded-full font-medium hover:bg-blue-800 transition-colors"
              >
                Seguir Comprando
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const iconColor = item.gender === "Dama" ? "text-pink-500" : "text-col-yellow";
                const iconBg = item.gender === "Dama" ? "bg-pink-50" : "bg-yellow-50";

                return (
                  <div key={item.variantId} className="p-4 flex items-center gap-4">
                    <div
                      className={`relative w-16 h-16 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover rounded-xl"
                          sizes="64px"
                        />
                      ) : (
                        <ShoppingBag className={`w-8 h-8 ${iconColor}`} />
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500">
                        {item.size} · {item.gender}
                      </p>
                      <p className="font-bold text-col-blue text-sm">{formatCOP(item.unitPrice)}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                        <button
                          onClick={() => updateQty(item.variantId, -1, getStock)}
                          className="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-col-blue"
                          aria-label={`Reducir cantidad de ${item.name}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.variantId, 1, getStock)}
                          className="w-7 h-8 flex items-center justify-center text-gray-500 hover:text-col-blue"
                          aria-label={`Aumentar cantidad de ${item.name}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-gray-400 hover:text-col-red transition-colors p-1"
                        aria-label={`Eliminar ${item.name} del carrito`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Subtotal</span>
              <span className="font-black text-xl text-col-blue">{formatCOP(subtotal)}</span>
            </div>
            <button
              onClick={onCheckout}
              disabled={checkingOut}
              className="w-full bg-col-blue text-white py-3.5 rounded-xl font-bold text-base hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none"
            >
              {checkingOut
                ? "Creando pago..."
                : userEmail
                ? "Proceder al Pago"
                : "Inicia sesión para pagar"}
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5" /> Pago 100% seguro con Wompi
            </div>
          </div>
        )}
      </div>
    </>
  );
}
