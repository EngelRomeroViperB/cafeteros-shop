"use client";

import { ArrowUpDown } from "lucide-react";

export type SortOption = "default" | "price_asc" | "price_desc" | "newest";
export type GenderFilter = "all" | "Dama" | "Caballero";

type Props = {
  categories: { id: string; name: string; slug: string }[];
  activeCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  gender: GenderFilter;
  onGenderChange: (gender: GenderFilter) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount: number;
};

export default function CatalogFilters({
  categories,
  activeCategoryId,
  onCategoryChange,
  gender,
  onGenderChange,
  sort,
  onSortChange,
  resultCount,
}: Props) {
  return (
    <div className="space-y-4 mb-8">
      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeCategoryId === null
              ? "bg-col-blue text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:border-col-blue hover:text-col-blue"
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategoryId === cat.id
                ? "bg-col-blue text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-col-blue hover:text-col-blue"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Gender + Sort row */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2">
          {(["all", "Dama", "Caballero"] as GenderFilter[]).map((g) => (
            <button
              key={g}
              onClick={() => onGenderChange(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                gender === g
                  ? "bg-dark-bg text-white"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {g === "all" ? "Todos" : g}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{resultCount} productos</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-gray-600 focus:outline-none focus:border-col-blue cursor-pointer"
            >
              <option value="default">Relevancia</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="newest">Más recientes</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
