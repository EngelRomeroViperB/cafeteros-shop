"use client";
import Image from "next/image";
import { ShoppingBag, ShoppingCart, ArrowRight } from "lucide-react";
import { formatCOP } from "@/lib/format";
import { onActivate } from "@/lib/keyboard";
import type { Product } from "@/types/store";
import { useState } from "react";

type Props = {
  product: Product;
  onClickProduct: (productId: string) => void;
  onQuickAdd?: (product: Product) => void;
  variant?: "featured" | "catalog";
};

function getThumb(product: Product): string | null {
  const primary = product.media?.find((m) => m.media_type === "image" && m.is_primary);
  const first = primary ?? product.media?.find((m) => m.media_type === "image");
  return first?.url ?? product.image_url ?? null;
}

function getSecondImage(product: Product): string | null {
  const images = product.media?.filter((m) => m.media_type === "image") ?? [];
  if (images.length < 2) return null;
  const primaryIdx = images.findIndex((m) => m.is_primary);
  const secondIdx = primaryIdx >= 0 ? (primaryIdx === 0 ? 1 : 0) : 1;
  return images[secondIdx]?.url ?? null;
}

export default function ProductCard({ product, onClickProduct, onQuickAdd, variant = "catalog" }: Props) {
  const [hovered, setHovered] = useState(false);
  const firstVariant = product.variants[0] ?? null;
  const thumb = getThumb(product);
  const secondImg = getSecondImage(product);
  const isDark = product.name.toLowerCase().includes("visitante");
  const descriptionClampClass =
    "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] md:[-webkit-line-clamp:2]";

  if (variant === "featured") {
    return (
      <div
        className="bg-gray-50 rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-col-blue h-full"
        role="button"
        tabIndex={0}
        onClick={() => onClickProduct(product.id)}
        onKeyDown={onActivate(() => onClickProduct(product.id))}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Imagen — aspect 3/4 para fotos de moda, object-cover para llenar el contenedor */}
        <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center relative overflow-hidden">
          {thumb ? (
            <>
              <Image
                src={thumb}
                alt={product.name}
                fill
                className={`object-cover transition-all duration-500 ${
                  hovered && secondImg ? "opacity-0 scale-105" : "opacity-100 scale-100 group-hover:scale-105"
                }`}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              {secondImg && (
                <Image
                  src={secondImg}
                  alt={`${product.name} alt`}
                  fill
                  className={`object-cover transition-all duration-500 ${
                    hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              )}
            </>
          ) : (
            <ShoppingBag className="w-24 h-24 text-col-yellow" />
          )}
          {product.badge && (
            <span className="absolute top-4 left-4 bg-col-red text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {product.badge}
            </span>
          )}
        </div>

        <div className="p-5 md:p-4">
          <h3 className="font-bold text-xl text-dark-bg mb-1">{product.name}</h3>
          {product.description && (
            <p className={`text-gray-500 text-sm mb-2 ${descriptionClampClass}`}>{product.description}</p>
          )}
          <div className="flex justify-between items-center">
            <span className="font-bold text-col-blue text-lg">
              {firstVariant ? formatCOP(firstVariant.price_cop) : ""}
            </span>
            <span className="text-col-blue font-medium text-sm flex items-center gap-1">
              Ver producto <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl p-5 md:p-6 shadow-lg border hover:shadow-xl transition-all duration-300 relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-col-blue h-full ${
        product.badge === "Más Vendida" ? "border-col-yellow" : "border-gray-100"
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onClickProduct(product.id)}
      onKeyDown={onActivate(() => onClickProduct(product.id))}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {product.badge === "Nuevo" && (
        <div className="absolute top-4 right-4 bg-col-red text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          Nuevo
        </div>
      )}
      {product.badge === "Más Vendida" && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-col-yellow text-col-blue text-xs font-bold px-4 py-1 rounded-t-lg z-10 uppercase tracking-wide shadow-sm">
          Más Vendida
        </div>
      )}

      {/* Imagen — aspect 3/4, object-cover, sin padding, fondo neutro */}
      <div
        className={`aspect-[3/4] rounded-xl mb-4 flex items-center justify-center overflow-hidden relative group-hover:scale-[1.02] transition-transform ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        {thumb ? (
          <>
            <Image
              src={thumb}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-500 ${
                hovered && secondImg ? "opacity-0 scale-105" : "opacity-100"
              }`}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {secondImg && (
              <Image
                src={secondImg}
                alt={`${product.name} alt`}
                fill
                className={`object-cover transition-all duration-500 ${
                  hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            )}
          </>
        ) : (
          <ShoppingBag
            className={`w-32 h-32 drop-shadow-md ${
              isDark
                ? "text-gray-800 border-[1px] border-gray-700/50 fill-gray-800 rounded-md"
                : "text-col-yellow"
            }`}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-xl text-dark-bg">{product.name}</h3>
          <span className="font-bold text-col-blue text-lg">
            {firstVariant ? formatCOP(firstVariant.price_cop) : "Sin precio"}
          </span>
        </div>
        {product.description && (
          <p className={`text-gray-500 text-sm ${descriptionClampClass}`}>{product.description}</p>
        )}
        {onQuickAdd && (
          <div className="pt-3 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              className={`w-full py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 ${
                product.badge === "Más Vendida"
                  ? "bg-col-yellow text-col-blue hover:bg-yellow-400 font-bold shadow-md"
                  : isDark
                  ? "bg-dark-bg text-white hover:bg-gray-800"
                  : "bg-dark-bg text-white hover:bg-col-blue"
              }`}
            >
              <ShoppingCart className="w-4 h-4" /> Añadir rápido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
