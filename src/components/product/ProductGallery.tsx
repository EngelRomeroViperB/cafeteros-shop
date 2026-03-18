"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import type { Product, ProductMedia } from "@/types/store";

type Props = {
  product: Product;
  selectedGender: "Dama" | "Caballero";
};

export default function ProductGallery({ product, selectedGender }: Props) {
  const rawMedia: ProductMedia[] = product.media ?? [];
  const allMedia = rawMedia.filter((m) => !m.gender || m.gender === selectedGender);
  const hasMedia = allMedia.length > 0;

  const primaryIdx = allMedia.findIndex((m) => m.media_type === "image" && m.is_primary);
  const initialIdx = primaryIdx >= 0 ? primaryIdx : 0;

  const [selectedIdx, setSelectedIdx] = useState(initialIdx);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Reset index when gender or product changes
  useEffect(() => {
    const idx = allMedia.findIndex((m) => m.media_type === "image" && m.is_primary);
    setSelectedIdx(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGender, product.id]);

  const current = hasMedia ? allMedia[selectedIdx] ?? allMedia[0] : null;
  const fallbackImg = product.image_url;

  // Mobile carousel scroll handler
  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.clientWidth;
    const newIdx = Math.round(scrollLeft / itemWidth);
    if (newIdx !== selectedIdx && newIdx >= 0 && newIdx < allMedia.length) {
      setSelectedIdx(newIdx);
    }
  }, [selectedIdx, allMedia.length]);

  const scrollToIdx = (idx: number) => {
    setSelectedIdx(idx);
    const el = carouselRef.current;
    if (el) {
      el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full lg:w-1/2">
      {/* Desktop: large image + thumbnails */}
      <div className="hidden md:block">
        <div className="bg-gray-100 rounded-3xl aspect-[4/5] flex items-center justify-center relative shadow-inner overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white opacity-50" />
          {current ? (
            current.media_type === "video" ? (
              <video
                key={current.id}
                src={current.url}
                className="w-full h-full object-contain relative z-10"
                controls
                playsInline
                muted
                autoPlay
                loop
              />
            ) : (
              <Image
                src={current.url}
                alt={product.name}
                fill
                className="object-contain drop-shadow-2xl z-10 transform transition-transform duration-700 hover:scale-125 p-[12%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            )
          ) : fallbackImg ? (
            <Image
              src={fallbackImg}
              alt={product.name}
              fill
              className="object-contain drop-shadow-2xl z-10 transform transition-transform duration-700 hover:scale-125 p-[12%]"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <ShoppingBag className="w-64 h-64 text-col-yellow drop-shadow-2xl relative z-10" />
          )}
          {product.badge && (
            <div className="absolute top-6 left-6 bg-col-red text-white text-xs font-bold px-4 py-1.5 rounded-full z-20 uppercase tracking-wider">
              {product.badge}
            </div>
          )}
        </div>

        {hasMedia && allMedia.length > 1 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {allMedia.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedIdx(idx)}
                className={`bg-gray-100 rounded-xl aspect-square flex items-center justify-center cursor-pointer overflow-hidden transition-all ${
                  idx === selectedIdx
                    ? "border-2 border-col-blue ring-2 ring-col-blue/20"
                    : "border border-gray-200 hover:border-gray-400"
                }`}
              >
                {m.media_type === "video" ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-xs font-bold text-gray-500">▶ Video</span>
                  </div>
                ) : (
                  <Image
                    src={m.url}
                    alt={`Miniatura ${idx + 1}`}
                    fill
                    className="object-contain p-[12%]"
                    sizes="80px"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: horizontal snap carousel + dots */}
      <div className="md:hidden">
        {hasMedia && allMedia.length > 1 ? (
          <>
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {allMedia.map((m, idx) => (
                <div
                  key={m.id}
                  className="snap-center flex-shrink-0 w-full aspect-square bg-gray-100 rounded-2xl flex items-center justify-center relative overflow-hidden"
                >
                  {m.media_type === "video" ? (
                    <video
                      src={m.url}
                      className="w-full h-full object-contain"
                      controls
                      playsInline
                      muted
                    />
                  ) : (
                    <Image
                      src={m.url}
                      alt={`${product.name} ${idx + 1}`}
                      fill
                      className="object-contain p-[12%]"
                      sizes="100vw"
                      priority={idx === 0}
                    />
                  )}
                  {idx === 0 && product.badge && (
                    <div className="absolute top-4 left-4 bg-col-red text-white text-xs font-bold px-3 py-1 rounded-full z-20 uppercase tracking-wider">
                      {product.badge}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-3">
              {allMedia.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToIdx(idx)}
                  className={`rounded-full transition-all ${
                    idx === selectedIdx
                      ? "w-6 h-2 bg-col-blue"
                      : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Imagen ${idx + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-gray-100 rounded-2xl aspect-square flex items-center justify-center relative shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white opacity-50" />
            {current ? (
              current.media_type === "video" ? (
                <video
                  src={current.url}
                  className="w-full h-full object-contain relative z-10"
                  controls
                  playsInline
                  muted
                />
              ) : (
                <Image
                  src={current.url}
                  alt={product.name}
                  fill
                  className="object-contain drop-shadow-2xl z-10 p-[12%]"
                  sizes="100vw"
                  priority
                />
              )
            ) : fallbackImg ? (
              <Image
                src={fallbackImg}
                alt={product.name}
                fill
                className="object-contain drop-shadow-2xl z-10 p-[12%]"
                sizes="100vw"
                priority
              />
            ) : (
              <ShoppingBag className="w-48 h-48 text-col-yellow drop-shadow-2xl relative z-10" />
            )}
            {product.badge && (
              <div className="absolute top-4 left-4 bg-col-red text-white text-xs font-bold px-3 py-1 rounded-full z-20 uppercase tracking-wider">
                {product.badge}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
