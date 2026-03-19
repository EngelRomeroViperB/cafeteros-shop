"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  gender?: "Dama" | "Caballero";
};

const sizesCaballero = [
  { label: "S", chest: "88-92", length: "68-70", shoulder: "42-44" },
  { label: "M", chest: "92-96", length: "70-72", shoulder: "44-46" },
  { label: "L", chest: "96-100", length: "72-74", shoulder: "46-48" },
  { label: "XL", chest: "100-104", length: "74-76", shoulder: "48-50" },
  { label: "XXL", chest: "104-108", length: "76-78", shoulder: "50-52" },
];

const sizesDama = [
  { label: "S", chest: "82-86", length: "60-62", shoulder: "36-38" },
  { label: "M", chest: "86-90", length: "62-64", shoulder: "38-40" },
  { label: "L", chest: "90-94", length: "64-66", shoulder: "40-42" },
  { label: "XL", chest: "94-98", length: "66-68", shoulder: "42-44" },
];

export default function SizeGuide({ open, onClose, gender }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"Caballero" | "Dama">(gender ?? "Caballero");

  useEffect(() => {
    if (open && gender) setActiveTab(gender);
  }, [open, gender]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = activeTab === "Caballero" ? sizesCaballero : sizesDama;

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
          {/* Gender tabs */}
          <div className="flex gap-2 mb-5">
            {(["Caballero", "Dama"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setActiveTab(g)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === g
                    ? "bg-col-blue text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm mb-4">Medidas en centímetros (cm). Mide la prenda extendida sobre una superficie plana.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-bold text-gray-900">Talla</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">Pecho</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">Largo</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">Hombro</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-bold text-col-blue">{s.label}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{s.chest}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{s.length}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{s.shoulder}</td>
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
