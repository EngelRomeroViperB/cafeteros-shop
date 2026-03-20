"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  DollarSign,
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
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import type {
  Category,
  Product,
  ProductDraft,
  ProductMedia as Media,
  ProductVariant as Variant,
} from "@/types/store";
import { formatCOP, slugify } from "@/lib/format";

type AdminProduct = Omit<Product, "media"> & { media: Media[] };

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

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [activeTab, setActiveTab] = useState<"list" | "edit" | "orders">("list");

  // orders
  type OrderItem = { id: string; title: string; selected_size: string; selected_gender: string; quantity: number; unit_price_cop: number; line_total_cop: number };
  type Order = { id: string; reference: string; status: string; wompi_status: string; total_cop: number; customer_email: string; shipping_name: string; shipping_phone: string; shipping_address: string; shipping_city: string; shipping_department: string; shipping_notes: string; created_at: string; items: OrderItem[] };
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingSizeItem, setEditingSizeItem] = useState<string | null>(null);
  const [sizeDraft, setSizeDraft] = useState({ new_size: "", new_gender: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>({ ...EMPTY_DRAFT });

  // variant editing
  const [variantDraft, setVariantDraft] = useState({ size: "", gender: "Caballero" as "Dama" | "Caballero", price_cop: "", cost_cop: "", stock: "", sort_order: "" });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // media
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaGender, setMediaGender] = useState<"Dama" | "Caballero" | "">("")

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detail || "Fetch failed");
      setProducts(json.products);
      setCategories(json.categories);
    } catch (err) {
      flash(`Error: ${err instanceof Error ? err.message : "al cargar productos"}`);
    } finally {
      setLoading(false);
    }
  }, [headers, flash]);

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed, fetchAll]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar pedidos");
      setOrders(json.orders ?? []);
    } catch (err) {
      flash(`Error: ${err instanceof Error ? err.message : "al cargar pedidos"}`);
    } finally {
      setOrdersLoading(false);
    }
  }, [headers, flash]);

  useEffect(() => {
    if (authed && activeTab === "orders") fetchOrders();
  }, [authed, activeTab, fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al actualizar");
      }
      flash("Estado actualizado");
      await fetchOrders();
    } catch (err) {
      flash(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  };

  const updateItemSize = async (orderId: string, itemId: string, newSize: string, newGender: string) => {
    try {
      const payload: Record<string, string> = {};
      if (newSize) payload.new_size = newSize;
      if (newGender) payload.new_gender = newGender;
      if (!payload.new_size && !payload.new_gender) { flash("Selecciona una nueva talla o género"); return; }
      const res = await fetch(`/api/admin/orders/${orderId}/items/${itemId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al cambiar talla");
      }
      flash("Talla actualizada correctamente");
      setEditingSizeItem(null);
      setSizeDraft({ new_size: "", new_gender: "" });
      await fetchOrders();
    } catch (err) {
      flash(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  };

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
    if (!editingId || !variantDraft.size || !variantDraft.gender || !variantDraft.price_cop) {
      flash("Completa talla, género y precio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product_id: editingId,
        size: variantDraft.size,
        gender: variantDraft.gender,
        price_cop: parseInt(variantDraft.price_cop),
        cost_cop: parseInt(variantDraft.cost_cop) || 0,
        stock: parseInt(variantDraft.stock) || 0,
        sort_order: parseInt(variantDraft.sort_order) || 0,
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
      setVariantDraft({ size: "", gender: "Caballero", price_cop: "", cost_cop: "", stock: "", sort_order: "" });
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
      gender: v.gender,
      price_cop: String(v.price_cop),
      cost_cop: String(v.cost_cop ?? 0),
      stock: String(v.stock),
      sort_order: String(v.sort_order ?? 0),
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
          gender: mediaGender || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      flash("Media añadido");
      setMediaUrl("");
      setMediaGender("");
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

  const togglePrimary = async (mediaItem: Media) => {
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          id: mediaItem.id,
          product_id: mediaItem.product_id,
          is_primary: !mediaItem.is_primary,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      flash(mediaItem.is_primary ? "Ya no es principal" : "Marcado como principal");
      await fetchAll();
    } catch (err: unknown) {
      flash(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
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
              activeTab === "list" || activeTab === "edit" ? "bg-yellow-400/10 text-yellow-400" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Package className="w-4 h-4" /> Productos
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "orders" ? "bg-yellow-400/10 text-yellow-400" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Pedidos
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
                    placeholder="https://tu-proyecto.supabase.co/storage/v1/object/public/bucket/imagen.jpg"
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
                      <span><span className="text-gray-500">Género:</span> {v.gender}</span>
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
                    <select
                      value={variantDraft.gender}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, gender: e.target.value as "Dama" | "Caballero" }))}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    >
                      <option value="Caballero">Caballero</option>
                      <option value="Dama">Dama</option>
                    </select>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    <input
                      type="number"
                      placeholder="Costo (COP)"
                      value={variantDraft.cost_cop}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, cost_cop: e.target.value }))}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Orden (0, 1, 2...)"
                      value={variantDraft.sort_order}
                      onChange={(e) => setVariantDraft((d) => ({ ...d, sort_order: e.target.value }))}
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
                          setVariantDraft({ size: "", gender: "Caballero", price_cop: "", cost_cop: "", stock: "", sort_order: "" });
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
                        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${m.media_type === "video" ? "bg-purple-500/80" : "bg-blue-500/80"} text-white`}>
                            {m.media_type === "video" ? "Video" : "Imagen"}
                          </span>
                          {m.gender && (
                            <span className={`text-xs px-1.5 py-0.5 rounded text-white ${m.gender === "Dama" ? "bg-pink-500/80" : "bg-sky-500/80"}`}>
                              {m.gender}
                            </span>
                          )}
                          {!m.gender && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/80 text-white">Ambos</span>
                          )}
                          {m.is_primary && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/90 text-gray-900 font-semibold">
                              Principal
                            </span>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          {m.media_type === "image" && (
                            <button
                              onClick={() => togglePrimary(m)}
                              className={`p-1 rounded text-white transition-opacity hover:bg-yellow-500 ${m.is_primary ? "bg-yellow-500" : "bg-gray-600/80 opacity-0 group-hover:opacity-100"}`}
                              title={m.is_primary ? "Quitar principal" : "Marcar como principal"}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteMedia(m.id)}
                            className="p-1 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                        placeholder="URL del archivo en Supabase Storage"
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
                    <select
                      value={mediaGender}
                      onChange={(e) => setMediaGender(e.target.value as "Dama" | "Caballero" | "")}
                      className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus:border-yellow-400 focus:outline-none text-white text-sm"
                    >
                      <option value="">Ambos</option>
                      <option value="Caballero">Caballero</option>
                      <option value="Dama">Dama</option>
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

        {activeTab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-yellow-400" /> Pedidos
              </h2>
              <button
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                {ordersLoading ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            {/* Metrics */}
            {(() => {
              const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered");
              const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_cop, 0);
              const today = new Date().toISOString().slice(0, 10);
              const todayOrders = paidOrders.filter((o) => o.created_at?.slice(0, 10) === today);
              const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_cop, 0);
              const thisMonth = new Date().toISOString().slice(0, 7);
              const monthOrders = paidOrders.filter((o) => o.created_at?.slice(0, 7) === thisMonth);
              const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total_cop, 0);

              // Calculate total cost from variants for profit
              const variantCostMap = new Map<string, number>();
              for (const p of products) {
                for (const v of p.variants) {
                  variantCostMap.set(`${v.size}-${v.gender}`, v.cost_cop ?? 0);
                }
              }
              const totalCost = paidOrders.reduce((sum, o) => {
                return sum + o.items.reduce((iSum, item) => {
                  const key = `${item.selected_size}-${item.selected_gender}`;
                  const cost = variantCostMap.get(key) ?? 0;
                  return iSum + cost * item.quantity;
                }, 0);
              }, 0);
              const totalProfit = totalRevenue - totalCost;

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><BarChart3 className="w-3.5 h-3.5" /> Ventas totales</div>
                    <div className="text-xl font-bold text-white">{formatCOP(totalRevenue)}</div>
                    <div className="text-xs text-gray-500">{paidOrders.length} pedidos confirmados</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Ganancia total</div>
                    <div className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCOP(totalProfit)}</div>
                    <div className="text-xs text-gray-500">Ingresa costos en variantes</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><BarChart3 className="w-3.5 h-3.5" /> Ventas hoy</div>
                    <div className="text-xl font-bold text-white">{formatCOP(todayRevenue)}</div>
                    <div className="text-xs text-gray-500">{todayOrders.length} pedidos</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><BarChart3 className="w-3.5 h-3.5" /> Ventas del mes</div>
                    <div className="text-xl font-bold text-white">{formatCOP(monthRevenue)}</div>
                    <div className="text-xs text-gray-500">{monthOrders.length} pedidos</div>
                  </div>
                </div>
              );
            })()}

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { value: "all", label: "Todos" },
                { value: "pending", label: "Pendientes" },
                { value: "paid", label: "Pagados" },
                { value: "shipped", label: "Enviados" },
                { value: "delivered", label: "Entregados" },
                { value: "canceled", label: "Cancelados" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setOrderFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    orderFilter === f.value ? "bg-yellow-400 text-gray-900" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {f.label}
                  {f.value !== "all" && (
                    <span className="ml-1 text-xs">({orders.filter((o) => o.status === f.value).length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Orders list */}
            {ordersLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {orders
                  .filter((o) => orderFilter === "all" || o.status === orderFilter)
                  .map((order) => {
                    const isExpanded = expandedOrder === order.id;
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-400/20 text-yellow-400",
                      paid: "bg-green-400/20 text-green-400",
                      shipped: "bg-blue-400/20 text-blue-400",
                      delivered: "bg-emerald-400/20 text-emerald-400",
                      canceled: "bg-red-400/20 text-red-400",
                      declined: "bg-red-400/20 text-red-400",
                      error: "bg-red-400/20 text-red-400",
                    };
                    const statusLabels: Record<string, string> = {
                      pending: "Pendiente",
                      paid: "Pagado",
                      shipped: "Enviado",
                      delivered: "Entregado",
                      canceled: "Cancelado",
                      declined: "Rechazado",
                      error: "Error",
                    };

                    return (
                      <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors text-left"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${statusColors[order.status] ?? "bg-gray-600 text-gray-300"}`}>
                              {statusLabels[order.status] ?? order.status}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-white text-sm truncate">{order.reference}</div>
                              <div className="text-xs text-gray-500">{order.shipping_name || order.customer_email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-white text-sm">{formatCOP(order.total_cop)}</div>
                              <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString("es-CO")}</div>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-700 p-4 space-y-4">
                            {/* Shipping info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Datos de envío</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="text-white">{order.shipping_name || "—"}</div>
                                  <div className="text-gray-400">{order.shipping_phone || "—"}</div>
                                  <div className="text-gray-400">{order.shipping_address || "—"}</div>
                                  <div className="text-gray-400">{order.shipping_city}{order.shipping_department ? `, ${order.shipping_department}` : ""}</div>
                                  {order.shipping_notes && <div className="text-gray-500 italic">{order.shipping_notes}</div>}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Info del pedido</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="text-gray-400">Email: <span className="text-white">{order.customer_email}</span></div>
                                  <div className="text-gray-400">Wompi: <span className="text-white">{order.wompi_status || "—"}</span></div>
                                  <div className="text-gray-400">Fecha: <span className="text-white">{new Date(order.created_at).toLocaleString("es-CO")}</span></div>
                                </div>
                              </div>
                            </div>

                            {/* Items */}
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Items</h4>
                              <div className="bg-gray-900 rounded-lg divide-y divide-gray-800">
                                {order.items.map((item) => {
                                  const isEditingSize = editingSizeItem === item.id;
                                  return (
                                    <div key={item.id} className="px-3 py-2 text-sm">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="text-white">{item.title}</span>
                                          <span className="text-gray-500 ml-2">({item.selected_size}, {item.selected_gender}) x{item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-medium">{formatCOP(item.line_total_cop)}</span>
                                          <button
                                            onClick={() => {
                                              if (isEditingSize) {
                                                setEditingSizeItem(null);
                                                setSizeDraft({ new_size: "", new_gender: "" });
                                              } else {
                                                setEditingSizeItem(item.id);
                                                setSizeDraft({ new_size: item.selected_size, new_gender: item.selected_gender });
                                              }
                                            }}
                                            className="text-yellow-400 hover:text-yellow-300 transition-colors p-1 rounded"
                                            title="Cambiar talla"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      {isEditingSize && (
                                        <div className="mt-2 flex items-center gap-2 flex-wrap bg-gray-800 rounded-lg p-2">
                                          <span className="text-xs text-gray-400 font-medium">Cambiar talla:</span>
                                          <select
                                            value={sizeDraft.new_size}
                                            onChange={(e) => setSizeDraft((d) => ({ ...d, new_size: e.target.value }))}
                                            className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-yellow-400 focus:outline-none"
                                          >
                                            {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                                              <option key={s} value={s}>{s}</option>
                                            ))}
                                          </select>
                                          <select
                                            value={sizeDraft.new_gender}
                                            onChange={(e) => setSizeDraft((d) => ({ ...d, new_gender: e.target.value }))}
                                            className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-yellow-400 focus:outline-none"
                                          >
                                            <option value="Caballero">Caballero</option>
                                            <option value="Dama">Dama</option>
                                          </select>
                                          <button
                                            onClick={() => updateItemSize(order.id, item.id, sizeDraft.new_size, sizeDraft.new_gender)}
                                            className="bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded hover:bg-yellow-300 transition-colors flex items-center gap-1"
                                          >
                                            <Save className="w-3 h-3" /> Guardar
                                          </button>
                                          <button
                                            onClick={() => { setEditingSizeItem(null); setSizeDraft({ new_size: "", new_gender: "" }); }}
                                            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Status actions */}
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Cambiar estado</h4>
                              <div className="flex gap-2 flex-wrap">
                                {["pending", "paid", "shipped", "delivered", "canceled"].map((s) => (
                                  <button
                                    key={s}
                                    disabled={order.status === s}
                                    onClick={() => updateOrderStatus(order.id, s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      order.status === s
                                        ? "bg-yellow-400 text-gray-900 cursor-default"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                    }`}
                                  >
                                    {statusLabels[s] ?? s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {orders.filter((o) => orderFilter === "all" || o.status === orderFilter).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No hay pedidos {orderFilter !== "all" ? `con estado "${orderFilter}"` : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
