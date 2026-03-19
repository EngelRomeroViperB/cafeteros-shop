"use client";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Wind } from "lucide-react";
import { formatCOP } from "@/lib/format";
import type { Product, ProductVariant } from "@/types/store";
import SizeGuide from "./SizeGuide";

type Props = {
  product: Product;
  selectedGender: "Dama" | "Caballero";
  selectedVariantId: string | null;
  onGenderChange: (gender: "Dama" | "Caballero") => void;
  onVariantChange: (variantId: string) => void;
  onAddToCart: (qty: number) => void;
};

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded">
        Agotado
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-0.5 rounded">
        Últimas {stock} unidades
      </span>
    );
  }
  return (
    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
      Disponible ({stock})
    </span>
  );
}

export default function VariantSelector({
  product,
  selectedGender,
  selectedVariantId,
  onGenderChange,
  onVariantChange,
  onAddToCart,
}: Props) {
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const availableGenders = [...new Set(product.variants.map((v) => v.gender))];
  const sizesForGender = product.variants.filter((v) => v.gender === selectedGender);
  const activeVariant: ProductVariant | null =
    product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const canAdd = activeVariant !== null && activeVariant.stock > 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl lg:text-5xl font-black text-dark-bg mb-2">
          {product.name}
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-2xl md:text-3xl font-bold text-col-blue">
            {activeVariant ? formatCOP(activeVariant.price_cop) : "Sin precio"}
          </p>
          {activeVariant && <StockBadge stock={activeVariant.stock} />}
        </div>
      </div>

      <p className="text-gray-600 mb-4 md:mb-8 text-base md:text-lg leading-relaxed">
        {product.description}
      </p>

      {/* Paso 1: Género — oculto */}
      <div className="hidden">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Selecciona el género</h3>
          <div className="flex gap-3">
            {availableGenders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  onGenderChange(g);
                  const firstWithStock =
                    product.variants.find((v) => v.gender === g && v.stock > 0) ??
                    product.variants.find((v) => v.gender === g);
                  if (firstWithStock) onVariantChange(firstWithStock.id);
                  setQty(1);
                }}
                className={`flex-1 rounded-xl py-3 text-center transition-all font-medium ${
                  selectedGender === g
                    ? "border-2 border-col-blue bg-blue-50 text-col-blue font-bold shadow-sm"
                    : "border border-gray-300 hover:border-col-blue hover:text-col-blue"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Paso 2: Talla */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-900">Selecciona tu talla</h3>
          <button
            className="text-col-blue text-sm hover:underline flex items-center gap-1"
            onClick={() => setSizeGuideOpen(true)}
          >
            <Wind className="w-4 h-4" /> Guía de tallas
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {sizesForGender.map((variant) => {
            const outOfStock = variant.stock <= 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  onVariantChange(variant.id);
                  setQty(1);
                }}
                className={`min-w-[56px] rounded-xl py-3 px-4 text-center transition-all ${
                  outOfStock
                    ? "border border-gray-200 text-gray-400 cursor-not-allowed line-through"
                    : selectedVariantId === variant.id
                    ? "border-2 border-col-blue bg-blue-50 text-col-blue font-bold shadow-sm"
                    : "border border-gray-300 font-medium hover:border-col-blue hover:text-col-blue"
                }`}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
        {sizesForGender.length === 0 && (
          <p className="text-gray-500 text-sm mt-2">No hay tallas disponibles para {selectedGender}.</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 md:gap-4 mb-6 md:mb-10">
        <div className="flex items-center border border-gray-300 rounded-xl bg-white w-32">
          <button
            className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-col-blue"
            onClick={() => setQty((c) => Math.max(1, c - 1))}
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={qty}
            className="w-full text-center font-bold focus:outline-none"
            readOnly
            aria-label="Cantidad"
          />
          <button
            className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-col-blue"
            onClick={() =>
              setQty((c) => (activeVariant ? Math.min(c + 1, activeVariant.stock) : c + 1))
            }
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => {
            onAddToCart(qty);
            setQty(1);
          }}
          disabled={!canAdd}
          className="flex-1 bg-col-yellow text-col-blue py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-yellow-400 transition-all shadow-[0_8px_20px_rgba(252,209,22,0.3)] hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <ShoppingBag className="w-5 h-5" /> Agregar al Carrito
        </button>
      </div>

      <SizeGuide open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} gender={selectedGender} />
    </>
  );
}
