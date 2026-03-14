"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  ChevronLeft,
  Eye,
  EyeOff,
  Film,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";

/* ───────── types ───────── */

type Category = { id: string; name: string; slug: string };

type Variant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  price_cop: number;
  stock: number;
  is_active: boolean;
};

type Media = {
  id: string;
  product_id: string;
  url: string;
  media_type: "image" | "video";
  sort_order: number;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  category_id: string | null;
  variants: Variant[];
  media: Media[];
};

type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  badge: string;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  category_id: string;
};

/* ───────── helpers ───────── */

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

const EMPTY_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  badge: "",
  image_url: "",
  is_featured: false,
  is_active: true,
  category_id: "",
};

/* ───────── component ───────── */

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [activeTab, setActiveTab] = useState<"list" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>({ ...EMPTY_DRAFT });

  // variant editing
  const [variantDraft, setVariantDraft] = useState({ size: "", color: "", price_cop: "", stock: "" });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // media
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", "x-admin-key": adminKey }),
    [adminKey],
  );

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", { headers });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      setProducts(json.products);
      setCategories(json.categories);
    } catch {
      flash("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, [headers, flash]);

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed, fetchAll]);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_key");
    if (stored) {
      setAdminKey(stored);
      setAuthed(true);
    }
  }, []);

  /* ── auth ── */
  const handleLogin = async () => {
    if (!keyInput.trim()) return;
    try {
      const res = await fetch("/api/admin/products", {
        headers: { "x-admin-key": keyInput.trim() },
      });
      if (res.ok) {
        setAdminKey(keyInput.trim());
        sessionStorage.setItem("admin_key", keyInput.trim());
        setAuthed(true);
      } else {
        const json = await res.json().catch(() => ({}));
        flash(json.detail ?? "Clave incorrecta");
      }
    } catch {
      flash("Error de conexión");
    }
  };

  /* ── product CRUD ── */
  const editingProduct = products.find((p) => p.id === editingId) ?? null;

  const openNew = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
    setActiveTab("edit");
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setDraft({
      name: p.name,
      slug: p.slug,
      description: p.description,
      badge: p.badge ?? "",
      image_url: p.image_url ?? "",
      is_featured: p.is_featured,
      is_active: p.is_active,
      category_id: p.category_id ?? "",
    });
    setActiveTab("edit");
  };

  const saveProduct = async () => {
    if (!draft.name || !draft.slug) {
      flash("Nombre y slug son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(draft) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      flash(editingId ? "Producto actualizado" : "Producto creado");
      if (!editingId) {
        setEditingId(json.product.id);
      }
      await fetchAll();
    } catch (err: unknown) {
      flash(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto y todas sus variantes/media?")) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error();
      flash("Producto eliminado");
      if (editingId === id) {
        setActiveTab("list");
        setEditingId(null);
      }
      await fetchAll();
    } catch {
      flash("Error al eliminar");
    }
  };

  /* ── variant CRUD ── */
  const addVariant = async () => {
    if (!editingId || !variantDraft.size || !variantDraft.color || !variantDraft.price_cop) {
      flash("Completa talla, color y precio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product_id: editingId,
        size: variantDraft.size,
        color: variantDraft.color,
        price_cop: parseInt(variantDraft.price_cop),
        stock: parseInt(variantDraft.stock) || 0,
      };
      const url = editingVariantId ? "/api/admin/variants" : "/api/admin/variants";
      const method = editingVariantId ? "PUT" : "POST";
      const body = editingVariantId ? { ...payload, id: editingVariantId } : payload;
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      flash(editingVariantId ? "Variante actualizada" : "Variante añadida");
      setVariantDraft({ size: "", color: "", price_cop: "", stock: "" });
      setEditingVariantId(null);
      await fetchAll();
    } catch (err: unknown) {
      flash(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async (id: string) => {
    try {
      await fetch(`/api/admin/variants?id=${id}`, { method: "DELETE", headers });
      flash("Variante eliminada");
      await fetchAll();
    } catch {
      flash("Error al eliminar variante");
    }
  };

  const startEditVariant = (v: Variant) => {
    setEditingVariantId(v.id);
    setVariantDraft({
      size: v.size,
      color: v.color,
      price_cop: String(v.price_cop),
      stock: String(v.stock),
    });
  };

  /* ── media CRUD ── */
  const addMedia = async () => {
    if (!editingId || !mediaUrl.trim()) {
      flash("Pega una URL");
      return;
    }
    setSaving(true);
    try {
      const currentMedia = editingProduct?.media ?? [];
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers,
        body: JSON.stringify({
          product_id: editingId,
          url: mediaUrl.trim(),
          media_type: mediaType,
          sort_order: currentMedia.length,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      flash("Media añadido");
      setMediaUrl("");
      await fetchAll();
    } catch (err: unknown) {
      flash(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      await fetch(`/api/admin/media?id=${id}`, { method: "DELETE", headers });
      flash("Media eliminado");
      await fetchAll();
    } catch {
      flash("Error al eliminar media");
    }
  };

  /* ── LOGIN SCREEN ── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <LayoutDashboard className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Admin Cafeteros</h1>
          </div>
          <label className="text-sm text-gray-400 mb-1 block">Clave de acceso</label>
          <div className="relative mb-4">
            <input
              type={showKey ? "text" : "password"}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-10 border border-gray-700 focus:border-yellow-400 focus:outline-none"
              placeholder="ADMIN_SECRET_KEY"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-yellow-400 text-gray-900 font-bold rounded-lg py-3 hover:bg-yellow-300 transition-colors"
          >
            Entrar
          </button>
          {toast && <p className="text-red-400 text-sm mt-3 text-center">{toast}</p>}
        </div>
      </div>
    );
  }

  /* ── MAIN ADMIN PANEL ── */
  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-xl border border-gray-700 z-50 animate-pulse">
          {toast}
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen sticky top-0">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-yellow-400" />
            <span className="font-bold text-lg">Cafeteros Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("list")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "list" ? "bg-yellow-400/10 text-yellow-400" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Package className="w-4 h-4" /> Productos
          </button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => {
              sessionStorage.removeItem("admin_key");
              setAuthed(false);
              setAdminKey("");
            }}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          </div>
        )}

        {!loading && activeTab === "list" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Productos ({products.length})</h2>
              <button
                onClick={openNew}
                className="bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-300 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nuevo producto
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No hay productos aún</p>
                <p className="text-sm">Crea tu primer producto con el botón de arriba</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {products.map((p) => {
                  const firstVariant = p.variants[0];
                  const firstMedia = p.media[0];
                  const thumb = p.image_url || firstMedia?.url || null;
                  return (
                    <div
                      key={p.id}
                      className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4 hover:border-gray-700 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {thumb ? (
                          firstMedia?.media_type === "video" && !p.image_url ? (
                            <Film className="w-6 h-6 text-gray-500" />
                          ) : (
                            <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <Package className="w-6 h-6 text-gray-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{p.name}</h3>
                          {p.badge && (
                            <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full">
                              {p.badge}
                            </span>
                          )}
                          {p.is_featured && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                          {!p.is_active && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactivo</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{p.slug}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{p.variants.length} variante{p.variants.length !== 1 ? "s" : ""}</span>
                          <span>{p.media.length} media</span>
                          {firstVariant && <span className="text-green-400">{formatCOP(firstVariant.price_cop)}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-2 rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400"
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
        )}

        {!loading && activeTab === "edit" && (
          <div>
            <button
              onClick={() => setActiveTab("list")}
              className="flex items-center gap-1 text-gray-500 hover:text-white mb-4 text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a productos
            </button>

            <h2 className="text-2xl font-bold mb-6">
              {editingId ? "Editar producto" : "Nuevo producto"}
            </h2>

            {/* ── Product Form ── */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
              <h3 className="font-semibold text-lg mb-4">Información general</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        name,
                        slug: editingId ? d.slug : slugify(name),
                      }));
                    }}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white"
                    placeholder="Camiseta Local 2026"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Slug *</label>
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white"
                    placeholder="camiseta-local-2026"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 mb-1 block">Descripción</label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white resize-none"
                    placeholder="Descripción del producto..."
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Imagen principal (URL)</label>
                  <input
                    type="text"
                    value={draft.image_url}
                    onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white"
                    placeholder="https://...supabase.co/storage/v1/object/public/..."
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Badge</label>
                  <select
                    value={draft.badge}
                    onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white"
                  >
                    <option value="">Sin badge</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Más Vendida">Más Vendida</option>
                    <option value="Oferta">Oferta</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Categoría</label>
                  <select
                    value={draft.category_id}
                    onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value }))}
                    className="w-full bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_featured}
                      onChange={(e) => setDraft((d) => ({ ...d, is_featured: e.target.checked }))}
                      className="w-4 h-4 rounded bg-gray-800 border-gray-600 accent-yellow-400"
                    />
                    <span className="text-sm text-gray-300">Destacado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded bg-gray-800 border-gray-600 accent-yellow-400"
                    />
                    <span className="text-sm text-gray-300">Activo</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {draft.image_url && (
                <div className="mt-4">
                  <label className="text-sm text-gray-400 mb-1 block">Preview</label>
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                    <img src={draft.image_url} alt="preview" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={saveProduct}
                  disabled={saving}
                  className="bg-yellow-400 text-gray-900 font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-yellow-300 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "Guardar cambios" : "Crear producto"}
                </button>
                {editingId && (
                  <button
                    onClick={() => deleteProduct(editingId)}
                    className="bg-red-500/10 text-red-400 font-medium px-4 py-2.5 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            {/* ── Variants ── */}
            {editingId && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
                <h3 className="font-semibold text-lg mb-4">
                  Variantes ({editingProduct?.variants.length ?? 0})
                </h3>

                {/* Existing variants */}
                {editingProduct?.variants.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 mb-3 bg-gray-800 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                      <span><span className="text-gray-500">Talla:</span> {v.size}</span>
                      <span><span className="text-gray-500">Color:</span> {v.color}</span>
                      <span><span className="text-gray-500">Precio:</span> {formatCOP(v.price_cop)}</span>
                      <span><span className="text-gray-500">Stock:</span> {v.stock}</span>
                    </div>
                    <button
                      onClick={() => startEditVariant(v)}
                      className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteVariant(v.id)}
                      className="p-1.5 rounded bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add/edit variant form */}
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-3">
                    {editingVariantId ? "Editar variante" : "Añadir variante"}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Talla (ej: M, L, XL)"
                      value={variantDraft.size}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, size: e.target.value }))}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Color (ej: Amarillo)"
                      value={variantDraft.color}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, color: e.target.value }))}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Precio COP"
                      value={variantDraft.price_cop}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, price_cop: e.target.value }))}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={variantDraft.stock}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, stock: e.target.value }))}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={addVariant}
                      disabled={saving}
                      className="bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm hover:bg-yellow-300 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> {editingVariantId ? "Actualizar" : "Añadir"}
                    </button>
                    {editingVariantId && (
                      <button
                        onClick={() => {
                          setEditingVariantId(null);
                          setVariantDraft({ size: "", color: "", price_cop: "", stock: "" });
                        }}
                        className="text-gray-500 hover:text-white px-3 py-2 text-sm"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Media ── */}
            {editingId && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="font-semibold text-lg mb-4">
                  Media ({editingProduct?.media.length ?? 0})
                </h3>

                {/* Existing media grid */}
                {editingProduct?.media && editingProduct.media.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {editingProduct.media.map((m) => (
                      <div key={m.id} className="relative rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group aspect-square">
                        {m.media_type === "video" ? (
                          <video
                            src={m.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseOut={(e) => {
                              const video = e.target as HTMLVideoElement;
                              video.pause();
                              video.currentTime = 0;
                            }}
                          />
                        ) : (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-2 left-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${m.media_type === "video" ? "bg-purple-500/80" : "bg-blue-500/80"} text-white`}>
                            {m.media_type === "video" ? "Video" : "Imagen"}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteMedia(m.id)}
                          className="absolute top-2 right-2 p-1 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add media form */}
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-3">Añadir media</p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="URL del archivo (Supabase Storage, Google Drive, etc.)"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="w-full bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                      />
                    </div>
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as "image" | "video")}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    >
                      <option value="image">Imagen</option>
                      <option value="video">Video</option>
                    </select>
                    <button
                      onClick={addMedia}
                      disabled={saving}
                      className="bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm hover:bg-yellow-300 transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      <ImagePlus className="w-3.5 h-3.5" /> Añadir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
