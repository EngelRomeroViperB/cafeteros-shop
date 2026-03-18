"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const sizes = [
  { label: "XS", chest: "84-88", waist: "68-72", hip: "84-88" },
  { label: "S", chest: "88-92", waist: "72-76", hip: "88-92" },
  { label: "M", chest: "92-96", waist: "76-80", hip: "92-96" },
  { label: "L", chest: "96-100", waist: "80-84", hip: "96-100" },
  { label: "XL", chest: "100-104", waist: "84-88", hip: "100-104" },
  { label: "XXL", chest: "104-108", waist: "88-92", hip: "104-108" },
];

export default function SizeGuide({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Guía de tallas"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-display text-xl font-bold text-dark-bg">Guía de Tallas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar guía de tallas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm mb-4">Medidas en centímetros (cm). Toma las medidas sobre el cuerpo.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-bold text-gray-900">Talla</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">Pecho</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">Cintura</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">Cadera</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-bold text-col-blue">{s.label}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{s.chest}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{s.waist}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{s.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-400 text-xs mt-4">
            Si estás entre dos tallas, recomendamos elegir la más grande para mayor comodidad.
          </p>
        </div>
      </div>
    </div>
  );
}
