"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  gender?: "Dama" | "Caballero";
};

const sizesCaballero = [
  { label: "S", chest: "87 - 92", waist: "75 - 80", hip: "86 - 91" },
  { label: "M", chest: "93 - 100", waist: "81 - 88", hip: "92 - 99" },
  { label: "L", chest: "101 - 108", waist: "89 - 96", hip: "100 - 107" },
  { label: "XL", chest: "109 - 118", waist: "97 - 106", hip: "108 - 116" },
  { label: "XXL", chest: "119 - 130", waist: "107 - 119", hip: "117 - 125" },
];

const sizesDama = [
  { label: "S", chest: "83 - 88", waist: "67 - 72", hip: "92 - 97" },
  { label: "M", chest: "89 - 94", waist: "73 - 78", hip: "98 - 103" },
  { label: "L", chest: "95 - 101", waist: "79 - 85", hip: "104 - 110" },
  { label: "XL", chest: "102 - 109", waist: "86 - 94", hip: "111 - 117" },
  { label: "XXL", chest: "110 - 118", waist: "95 - 104", hip: "118 - 125" },
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

          <p className="text-gray-500 text-sm mb-4">Medidas corporales en centímetros (cm).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-bold text-gray-900">Talla</th>
                  <th className="text-center py-3 px-2 font-bold text-gray-900">{activeTab === "Dama" ? "Busto" : "Pecho"}</th>
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
