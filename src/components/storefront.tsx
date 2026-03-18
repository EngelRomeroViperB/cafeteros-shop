"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Leaf,
  Lock,
  LogOut,
  Menu,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  Wind,
  X,
} from "lucide-react";
import Image from "next/image";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { formatCOP } from "@/lib/format";
import { onActivate } from "@/lib/keyboard";
import { useCart, useCartTotalItems, useCartSubtotal } from "@/lib/store/cart";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import VariantSelector from "@/components/product/VariantSelector";
import CartDrawer from "@/components/cart/CartDrawer";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import type { GenderFilter, SortOption } from "@/components/catalog/CatalogFilters";
import type { Category, Product } from "@/types/store";

type Props = {
  products: Product[];
  categories: Category[];
};

type ViewName = "home" | "product" | "cart" | "login" | "collections";

const supabase = createBrowserSupabaseClient();

function getStartingVariant(product: Product) {
  return product.variants[0] ?? null;
}

function CartPageItems({ products }: { products: Product[] }) {
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const removeItem = useCart((s) => s.removeItem);

  const getStock = (variantId: string): number => {
    for (const p of products) {
      const v = p.variants.find((v) => v.id === variantId);
      if (v) return v.stock;
    }
    return Infinity;
  };

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => {
        const iconColor = item.gender === "Dama" ? "text-pink-500" : "text-col-yellow";
        const iconBg = item.gender === "Dama" ? "bg-pink-50" : "bg-yellow-50";
        return (
          <div key={item.variantId} className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4 md:gap-6">
            <div className={`relative w-20 h-20 md:w-24 md:h-24 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}>
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover rounded-xl" sizes="96px" />
              ) : (
                <ShoppingBag className={`w-12 h-12 ${iconColor}`} />
              )}
            </div>
            <div className="flex-grow text-center sm:text-left">
              <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-2">Talla: {item.size} · {item.gender}</p>
              <p className="font-bold text-col-blue">{formatCOP(item.unitPrice)}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                <button onClick={() => updateQty(item.variantId, -1, getStock)} className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-col-blue" aria-label={`Reducir cantidad de ${item.name}`}>
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-10 text-center font-bold text-sm">{item.qty}</span>
                <button onClick={() => updateQty(item.variantId, 1, getStock)} className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-col-blue" aria-label={`Aumentar cantidad de ${item.name}`}>
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <button onClick={() => removeItem(item.variantId)} className="text-gray-500 hover:text-col-red transition-colors p-2" title="Eliminar" aria-label={`Eliminar ${item.name} del carrito`}>
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Storefront({ products, categories }: Props) {
  const [view, setView] = useState<ViewName>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string>("");
  const [activeProductId, setActiveProductId] = useState<string | null>(products[0]?.id ?? null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(products[0]?.variants[0]?.id ?? null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedGender, setSelectedGender] = useState<"Dama" | "Caballero">("Caballero");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterGender, setFilterGender] = useState<GenderFilter>("all");
  const [filterSort, setFilterSort] = useState<SortOption>("default");

  // Zustand cart
  const cartItems = useCart((s) => s.items);
  const addItemToCart = useCart((s) => s.addItem);
  const totalItems = useCartTotalItems();
  const subtotal = useCartSubtotal();

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) ?? products[0] ?? null,
    [activeProductId, products],
  );
  const activeVariant = useMemo(
    () => activeProduct?.variants.find((variant) => variant.id === selectedVariantId) ?? activeProduct?.variants[0] ?? null,
    [activeProduct, selectedVariantId],
  );

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setUserEmail(data.session?.user.email ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user.email ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!activeProduct) {
      return;
    }

    const firstGender = activeProduct.variants[0]?.gender ?? "Caballero";
    setSelectedGender(firstGender);
    const firstVariantForGender = activeProduct.variants.find((v) => v.gender === firstGender && v.stock > 0) ?? activeProduct.variants.find((v) => v.gender === firstGender);
    setSelectedVariantId(firstVariantForGender?.id ?? activeProduct.variants[0]?.id ?? null);
  }, [activeProductId, activeProduct]);

  const navigate = (nextView: ViewName, replace = false) => {
    setView(nextView);
    setMobileMenuOpen(false);
    const state = { view: nextView, productId: activeProductId };
    if (replace) {
      window.history.replaceState(state, "");
    } else {
      window.history.pushState(state, "");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    // Seed initial history state
    window.history.replaceState({ view: "home", productId: null }, "");

    const onPopState = (e: PopStateEvent) => {
      const s = e.state as { view?: ViewName; productId?: string | null } | null;
      if (s?.view) {
        setView(s.view);
        if (s.productId) setActiveProductId(s.productId);
      } else {
        setView("home");
      }
      setMobileMenuOpen(false);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Focus trap for mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) {
      // Restore focus to the menu button when closing
      mobileMenuBtnRef.current?.focus();
      return;
    }

    const container = mobileMenuRef.current;
    if (!container) return;

    const focusables = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (focusables.length === 0) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const goHomeAndScroll = (sectionId: string) => {
    navigate("home");
    setTimeout(() => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  const addToCart = (product: Product, variantId?: string, qty = 1) => {
    const vid = variantId ?? getStartingVariant(product)?.id;
    if (!vid) {
      setToast("Producto sin variantes disponibles");
      return;
    }
    const err = addItemToCart(product, vid, qty);
    if (err) {
      setToast(err);
      return;
    }
    setToast("Producto añadido al carrito");
    setCartDrawerOpen(true);
  };

  const handleAuth = async (mode: "login" | "signup") => {
    if (!supabase) {
      setToast("Configura Supabase para iniciar sesión");
      return;
    }

    if (!authEmail || !authPassword) {
      setToast("Completa correo y contraseña");
      return;
    }

    setAuthBusy(true);
    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: { emailRedirectTo: window.location.origin },
          });
    setAuthBusy(false);

    if (response.error) {
      setToast(response.error.message);
      return;
    }

    setUserEmail(response.data.user?.email ?? authEmail);
    if (mode === "signup" && !response.data.session) {
      setToast("Cuenta creada. Revisa tu correo para confirmar.");
      return;
    }

    navigate("cart");
    setToast(mode === "login" ? "Sesión iniciada" : "Cuenta creada");
  };

  const handleLogout = async () => {
    if (!supabase) {
      setUserEmail(null);
      setToast("Sesión cerrada");
      return;
    }

    await supabase.auth.signOut();
    setUserEmail(null);
    setToast("Sesión cerrada");
  };

  const goCheckout = async () => {
    if (cartItems.length === 0) {
      setToast("Tu carrito está vacío");
      return;
    }

    if (!userEmail) {
      setView("login");
      setToast("Inicia sesión para continuar");
      return;
    }

    try {
      setCheckingOut(true);
      const userId = supabase
        ? (await supabase.auth.getSession()).data.session?.user.id ?? null
        : null;

      const res = await fetch("/api/checkout/wompi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: userEmail,
          userId,
          items: cartItems,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "No fue posible crear el pago");
      }

      const payload = (await res.json()) as { checkoutUrl: string };
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado";
      setToast(message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 selection:bg-col-yellow selection:text-col-blue flex flex-col min-h-screen">
      
      {/* Toast Notification */}
      <div
        id="toast"
        className={`fixed bottom-5 right-5 z-[100] transform transition-all duration-300 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
        } bg-dark-bg text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700`}
      >
        <div className="bg-green-500/20 text-green-400 p-1.5 rounded-full">
          <Check className="w-5 h-5" />
        </div>
        <p className="font-medium">{toast || "ok"}</p>
      </div>

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-col-yellow focus:text-col-blue focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        Saltar al contenido
      </a>

      {/* Navigation */}
      <nav
        role="navigation"
        aria-label="Navegación principal"
        className="fixed w-full z-50 transition-all duration-300 bg-dark-bg/95 backdrop-blur-sm border-b border-gray-800 shadow-lg"
        id="navbar"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center cursor-pointer" role="button" tabIndex={0} onClick={() => navigate("home")} onKeyDown={onActivate(() => navigate("home"))} aria-label="Ir al inicio">
              <div className="w-10 h-10 rounded-full bg-col-yellow flex items-center justify-center mr-3 border-2 border-col-blue shadow-[0_0_10px_rgba(252,209,22,0.5)] transition-transform hover:scale-110">
                <span className="font-display font-bold text-col-blue text-lg">CF</span>
              </div>
              <span className="font-display font-bold text-xl text-white tracking-wider hidden sm:block">
                CAFETEROS
              </span>
            </div>

            {/* Menú Desktop */}
            <div className="hidden md:flex space-x-8 items-center">
              <button
                onClick={() => navigate("home")}
                className={`transition-colors font-medium ${view === "home" ? "text-col-yellow" : "text-gray-300 hover:text-col-yellow"}`}
                aria-current={view === "home" ? "page" : undefined}
              >
                Inicio
              </button>
              <button
                onClick={() => goHomeAndScroll("detalles")}
                className="text-gray-300 hover:text-col-yellow transition-colors font-medium"
              >
                Innovación
              </button>
              <button
                onClick={() => navigate("collections")}
                className={`transition-colors font-medium ${view === "collections" ? "text-col-yellow" : "text-gray-300 hover:text-col-yellow"}`}
                aria-current={view === "collections" ? "page" : undefined}
              >
                Colección
              </button>
            </div>

            {/* Íconos de Usuario y Carrito */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <button
                onClick={() => navigate("login")}
                className="text-gray-300 hover:text-col-yellow transition-colors flex items-center gap-2"
                aria-label={userEmail ? "Mi cuenta" : "Iniciar sesión"}
              >
                <User className="w-6 h-6" />
                <span className="hidden lg:block font-medium text-sm">{userEmail ? "Mi cuenta" : "Entrar"}</span>
              </button>

              <button
                onClick={() => setCartDrawerOpen(true)}
                className="text-gray-300 hover:text-col-yellow transition-colors relative flex items-center gap-2"
                aria-label={`Carrito con ${totalItems} productos`}
              >
                <div className="relative">
                  <ShoppingBag className="w-6 h-6" />
                  <span
                    className={`absolute -top-2 -right-2 bg-col-red text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-dark-bg transition-transform duration-300 ${
                      totalItems > 0 ? "scale-100" : "scale-0"
                    }`}
                  >
                    {totalItems}
                  </span>
                </div>
                <span className="hidden lg:block font-medium text-sm">Carrito</span>
              </button>

              {/* Botón Móvil */}
              <button
                ref={mobileMenuBtnRef}
                className="md:hidden text-white hover:text-col-yellow"
                onClick={() => setMobileMenuOpen((current) => !current)}
                aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="border-t border-gray-800 bg-dark-bg px-4 pb-4 pt-3 md:hidden"
            role="dialog"
            aria-label="Menú de navegación"
            onKeyDown={(e) => { if (e.key === "Escape") setMobileMenuOpen(false); }}
          >
            <div className="flex flex-col gap-2">
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => navigate("home")}>
                Inicio
              </button>
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => goHomeAndScroll("detalles")}>
                Innovación
              </button>
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => navigate("collections")}>
                Colección
              </button>
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => navigate("login")}>
                {userEmail ? "Mi cuenta" : "Entrar"}
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow" id="main-content" role="main">
        {view === "home" && (
          <div className="page-view block">
            {/* Hero Section */}
            <section
              id="inicio"
              className="relative pt-20 pb-10 lg:pt-28 lg:pb-12 overflow-hidden hero-pattern flex items-center min-h-[60vh] md:min-h-[75vh]"
            >
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-col-red mix-blend-multiply filter blur-[80px] opacity-40 animate-blob"></div>
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[30%] rounded-full bg-col-blue mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-col-yellow mix-blend-multiply filter blur-[80px] opacity-30 animate-blob animation-delay-4000"></div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                  <div className="w-full lg:w-1/2 text-center lg:text-left pt-10 lg:pt-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
                      <span className="w-2 h-2 rounded-full bg-col-yellow animate-pulse"></span>
                      <span className="text-col-yellow text-xs font-semibold uppercase tracking-wider">
                        Edición Oficial 2026
                      </span>
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
                      NUESTRA PIEL,<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-col-yellow via-yellow-300 to-col-yellow">
                        NUESTRO ORGULLO.
                      </span>
                    </h1>
                    <p className="text-sm md:text-base text-gray-300 mb-6 max-w-lg mx-auto lg:mx-0">
                      Presentamos la nueva armadura de la Selección Colombia. Diseñada con tecnología de punta y
                      llevando en cada hilo el corazón de 50 millones de colombianos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                      <button
                        onClick={() => {
                          if (activeProduct?.id) {
                            setActiveProductId(activeProduct.id);
                          }
                          navigate("product");
                        }}
                        className="bg-col-yellow text-col-blue px-5 py-2.5 rounded-full font-bold text-sm hover:bg-yellow-300 hover:scale-105 transition-all shadow-[0_0_15px_rgba(252,209,22,0.4)] flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Comprar Ahora
                      </button>
                      <button
                        onClick={() => goHomeAndScroll("detalles")}
                        className="px-5 py-2.5 rounded-full font-bold text-sm text-white border-2 border-white/30 hover:border-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        Ver Detalles
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="w-full lg:w-1/2 flex justify-center cursor-pointer relative"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (activeProduct?.id) {
                        setActiveProductId(activeProduct.id);
                      }
                      navigate("product");
                    }}
                    onKeyDown={onActivate(() => { if (activeProduct?.id) setActiveProductId(activeProduct.id); navigate("product"); })}
                    aria-label={`Ver ${activeProduct?.name ?? "producto"}`}
                  >
                    <div className="relative w-full max-w-[240px] mx-auto aspect-[4/5] bg-gradient-to-tr from-gray-800 to-gray-700 rounded-2xl p-5 shadow-2xl border border-gray-600/50 flex flex-col items-center justify-center transform lg:rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 overflow-hidden group">
                      <div className="absolute top-3 right-3 bg-col-yellow text-col-blue text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-md">
                        Clic para ver
                      </div>
                      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center transition-transform duration-500 group-hover:-translate-y-2">
                        <div className="relative w-32 h-40 flex items-center justify-center">
                          {activeProduct?.image_url ? (
                            <Image src={activeProduct.image_url} alt={activeProduct.name} fill className="object-contain drop-shadow-2xl" sizes="128px" />
                          ) : (
                            <ShoppingBag className="w-full h-full text-col-yellow drop-shadow-2xl" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50"></div>
                    </div>
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-col-red rounded-full mix-blend-multiply opacity-50 blur-xl"></div>
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-col-blue rounded-full mix-blend-multiply opacity-50 blur-xl"></div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-3 flex">
                <div className="w-full h-full bg-col-yellow" style={{ flex: 2 }}></div>
                <div className="w-full h-full bg-col-blue" style={{ flex: 1 }}></div>
                <div className="w-full h-full bg-col-red" style={{ flex: 1 }}></div>
              </div>
            </section>

            {/* Productos Destacados – 3 tarjetas */}
            <section id="destacados" className="py-12 md:py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-14">
                  <h2 className="font-display text-3xl md:text-4xl font-black text-dark-bg mb-3">Nuestros Productos</h2>
                  <p className="text-gray-500">Encuentra la camiseta perfecta para ti.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {products.filter((p) => {
                    const conjuntoCat = categories.find((c) => c.slug === "conjuntos");
                    return !conjuntoCat || p.category_id !== conjuntoCat.id;
                  }).slice(0, 2).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="featured"
                      onClickProduct={(id) => { setActiveProductId(id); navigate("product"); }}
                    />
                  ))}

                  {/* Tarjeta de Colecciones */}
                  <div
                    className="bg-gradient-to-br from-dark-bg to-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-700 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-col-yellow"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("collections")}
                    onKeyDown={onActivate(() => navigate("collections"))}
                  >
                    <div className="aspect-square md:aspect-[4/5] flex items-center justify-center relative overflow-hidden">
                      <div className="text-center px-8">
                        <div className="w-20 h-20 bg-col-yellow/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                          <ShoppingBag className="w-10 h-10 text-col-yellow" />
                        </div>
                        <h3 className="font-display text-2xl font-bold text-white mb-2">Colecciones</h3>
                        <p className="text-gray-400 text-sm">Descubre nuestros conjuntos deportivos exclusivos.</p>
                      </div>
                    </div>
                    <div className="p-6 border-t border-gray-700">
                      <span className="text-col-yellow font-bold text-sm flex items-center gap-2 justify-center group-hover:gap-3 transition-all">
                        Ver Colecciones <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Detalles */}
            <section id="detalles" className="py-14 md:py-24 bg-white relative">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-col-red font-bold tracking-wide uppercase text-sm mb-2">
                    Tecnología de Alto Rendimiento
                  </h2>
                  <h3 className="font-display text-3xl md:text-5xl font-black text-dark-bg mb-6">
                    Diseñada para hacer historia
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Cada detalle de la nueva camiseta ha sido pensado para brindar la máxima comodidad a nuestros
                    jugadores y a la hinchada, honrando los colores que nos unen.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-16">
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-col-blue group-hover:text-white transition-all duration-300 shadow-sm">
                      <Wind className="w-10 h-10 text-col-blue group-hover:text-white transition-colors" />
                    </div>
                    <h4 className="text-xl font-bold text-dark-bg mb-3">Tecnología Aero-Fresh</h4>
                    <p className="text-gray-600">Tejido ultra transpirable que absorbe el sudor al instante.</p>
                  </div>
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-col-yellow group-hover:text-col-blue transition-all duration-300 shadow-sm">
                      <Leaf className="w-10 h-10 text-yellow-600 group-hover:text-col-blue transition-colors" />
                    </div>
                    <h4 className="text-xl font-bold text-dark-bg mb-3">Materiales Reciclados</h4>
                    <p className="text-gray-600">Fabricada con un 100% de poliéster reciclado del océano.</p>
                  </div>
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-col-red group-hover:text-white transition-all duration-300 shadow-sm">
                      <ShieldCheck className="w-10 h-10 text-col-red group-hover:text-white transition-colors" />
                    </div>
                    <h4 className="text-xl font-bold text-dark-bg mb-3">Ajuste Ergonómico</h4>
                    <p className="text-gray-600">Corte atlético que se adapta a los movimientos del cuerpo.</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

      {view === "product" && activeProduct && (
        <div className="page-view block pt-24 md:pt-28 pb-16 md:pb-24 bg-white min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex text-sm text-gray-500 mb-4 md:mb-8 items-center gap-2">
              <button onClick={() => navigate("home")} className="hover:text-col-blue flex-shrink-0">
                Inicio
              </button>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <span className="text-gray-900 font-medium truncate">{activeProduct.name}</span>
            </nav>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-12 lg:gap-20">
              <ProductGallery product={activeProduct} selectedGender={selectedGender} />

              {/* Detalles del Producto */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center">
                <VariantSelector
                  product={activeProduct}
                  selectedGender={selectedGender}
                  selectedVariantId={selectedVariantId}
                  onGenderChange={(g) => {
                    setSelectedGender(g);
                    const first = activeProduct.variants.find((v) => v.gender === g && v.stock > 0) ?? activeProduct.variants.find((v) => v.gender === g);
                    setSelectedVariantId(first?.id ?? null);
                  }}
                  onVariantChange={(id) => setSelectedVariantId(id)}
                  onAddToCart={(qty) => addToCart(activeProduct, selectedVariantId ?? undefined, qty)}
                />

                {/* Acordeón de información */}
                <div className="border-t border-gray-200 pt-6 space-y-0 divide-y divide-gray-200">
                  <div>
                    <button
                      onClick={() => setOpenAccordion(openAccordion === "details" ? null : "details")}
                      className="flex justify-between items-center w-full py-4 text-gray-900 hover:text-col-blue font-bold"
                      aria-expanded={openAccordion === "details"}
                      aria-controls="accordion-details"
                    >
                      <span>Detalles del producto</span>
                      <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openAccordion === "details" ? "rotate-90" : "rotate-0"}`} />
                    </button>
                    <div id="accordion-details" role="region" aria-label="Detalles del producto" className={`overflow-hidden transition-all duration-300 ${openAccordion === "details" ? "max-h-60 pb-4" : "max-h-0"}`}>
                      <p className="text-gray-600 text-sm leading-relaxed">{activeProduct.description || "Producto de alta calidad diseñado para el máximo rendimiento y comodidad."}</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => setOpenAccordion(openAccordion === "shipping" ? null : "shipping")}
                      className="flex justify-between items-center w-full py-4 text-gray-900 hover:text-col-blue font-bold"
                      aria-expanded={openAccordion === "shipping"}
                      aria-controls="accordion-shipping"
                    >
                      <span>Envíos y devoluciones</span>
                      <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openAccordion === "shipping" ? "rotate-90" : "rotate-0"}`} />
                    </button>
                    <div id="accordion-shipping" role="region" aria-label="Envíos y devoluciones" className={`overflow-hidden transition-all duration-300 ${openAccordion === "shipping" ? "max-h-60 pb-4" : "max-h-0"}`}>
                      <ul className="text-gray-600 text-sm leading-relaxed space-y-1">
                        <li>• Envío gratis a partir de $200.000 COP</li>
                        <li>• Entrega en 3-5 días hábiles a nivel nacional</li>
                        <li>• Devoluciones gratis dentro de los primeros 30 días</li>
                        <li>• Producto debe estar sin uso y con etiquetas originales</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "cart" && (
        <div className="page-view block pt-24 md:pt-28 pb-16 md:pb-24 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-display text-2xl md:text-3xl font-black text-dark-bg mb-6 md:mb-8 flex items-center gap-3">
              <ShoppingCart className="w-7 h-7 md:w-8 md:h-8 text-col-blue" />
              Tu Carrito
            </h1>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-2/3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="cart-container">
                  {cartItems.length === 0 ? (
                    <div className="p-8 md:p-12 text-center text-gray-500">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h3>
                      <p className="mb-6">¡Agrega la nueva piel y prepárate para el partido!</p>
                      <button
                        onClick={() => navigate("home")}
                        className="bg-col-blue text-white px-6 py-3 rounded-full font-medium hover:bg-blue-800 transition-colors"
                      >
                        Seguir Comprando
                      </button>
                    </div>
                  ) : (
                    <CartPageItems products={products} />
                  )}
                </div>
              </div>

              <div className="w-full lg:w-1/3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-28">
                  <h2 className="font-bold text-lg text-gray-900 mb-6">Resumen del Pedido</h2>
                  
                  <div className="space-y-4 text-gray-600 mb-6">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-gray-900">{formatCOP(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Envío</span>
                      <span className="font-medium text-gray-900">Por calcular</span>
                    </div>
                    <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-black text-2xl text-col-blue">{formatCOP(subtotal)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!userEmail) {
                        navigate("login");
                        setToast("Inicia sesión para continuar al pago");
                        return;
                      }
                      goCheckout().catch(() => null);
                    }}
                    disabled={checkingOut || cartItems.length === 0}
                    className="w-full bg-col-blue text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 mb-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none"
                  >
                    {checkingOut ? "Creando pago..." : userEmail ? "Proceder al Pago" : "Inicia sesión para pagar"}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Lock className="w-4 h-4" /> Pago 100% seguro con Wompi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "collections" && (
        <div className="page-view block pt-24 md:pt-28 pb-16 md:pb-24 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex text-sm text-gray-500 mb-4 md:mb-8 items-center gap-2">
              <button onClick={() => navigate("home")} className="hover:text-col-blue flex-shrink-0">Inicio</button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">Colección</span>
            </nav>

            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-14">
              <h1 className="font-display text-2xl md:text-4xl font-black text-dark-bg mb-3">Nuestra Colección</h1>
              <p className="text-gray-500">Equípate con lo mejor para alentar a la tricolor.</p>
            </div>

            {(() => {
              let filtered = filterCategory
                ? products.filter((p) => p.category_id === filterCategory)
                : [...products];

              if (filterGender !== "all") {
                filtered = filtered.filter((p) =>
                  p.variants.some((v) => v.gender === filterGender && v.stock > 0),
                );
              }

              if (filterSort === "price_asc") {
                filtered.sort((a, b) => (a.variants[0]?.price_cop ?? 0) - (b.variants[0]?.price_cop ?? 0));
              } else if (filterSort === "price_desc") {
                filtered.sort((a, b) => (b.variants[0]?.price_cop ?? 0) - (a.variants[0]?.price_cop ?? 0));
              }

              return (
                <>
                  <CatalogFilters
                    categories={categories}
                    activeCategoryId={filterCategory}
                    onCategoryChange={setFilterCategory}
                    gender={filterGender}
                    onGenderChange={setFilterGender}
                    sort={filterSort}
                    onSortChange={setFilterSort}
                    resultCount={filtered.length}
                  />

                  {filtered.length === 0 ? (
                    <div className="text-center py-20">
                      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Sin resultados</h3>
                      <p className="text-gray-500 mb-6">No encontramos productos con esos filtros.</p>
                      <button
                        onClick={() => { setFilterCategory(null); setFilterGender("all"); setFilterSort("default"); }}
                        className="bg-col-blue text-white px-6 py-3 rounded-full font-medium hover:bg-blue-800 transition-colors"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filtered.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onClickProduct={(id) => { setActiveProductId(id); navigate("product"); }}
                          onQuickAdd={(p) => addToCart(p)}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {view === "login" && (
        <div className="page-view block min-h-screen hero-pattern flex items-center justify-center py-20 px-4">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-col-yellow/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="bg-dark-bg border border-gray-700 rounded-3xl p-8 md:p-12 w-full max-w-md relative z-10 shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-col-yellow mx-auto flex items-center justify-center mb-4 border-2 border-col-blue shadow-[0_0_15px_rgba(252,209,22,0.4)] cursor-pointer" role="button" tabIndex={0} onClick={() => navigate("home")} onKeyDown={onActivate(() => navigate("home"))} aria-label="Ir al inicio">
                <span className="font-display font-bold text-col-blue text-2xl">FCF</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white">{userEmail ? "Tu cuenta" : "Inicia Sesión"}</h2>
              <p className="text-gray-400 mt-2 text-sm">{userEmail ? `Conectado como ${userEmail}` : "Accede para continuar con tu compra"}</p>
            </div>

            {userEmail ? (
              <div className="mt-6 space-y-4">
                <button className="w-full rounded-xl border border-gray-600 py-3 font-semibold text-white hover:bg-gray-800 transition-colors" onClick={() => navigate("cart")}>
                  Ir al carrito
                </button>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-col-red/20 border border-col-red/50 text-red-400 py-3 font-semibold hover:bg-col-red/30 transition-colors"
                  onClick={() => handleLogout().catch(() => null)}
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            ) : (
              <>
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAuth("login").catch(() => null);
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="hincha@colombia.com"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-col-yellow focus:ring-1 focus:ring-col-yellow transition-colors"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-300">Contraseña</label>
                      <button type="button" className="text-col-yellow text-xs hover:underline" onClick={() => setToast("Próximamente")}>¿Olvidaste tu contraseña?</button>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-col-yellow focus:ring-1 focus:ring-col-yellow transition-colors"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full bg-col-yellow text-col-blue py-3.5 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all shadow-lg shadow-col-yellow/20 mt-6 disabled:opacity-70"
                  >
                    {authBusy ? "Procesando..." : "Entrar a la Tribuna"}
                  </button>
                </form>

                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-dark-bg text-gray-400">O</span>
                  </div>
                </div>

                <button
                  className="mt-6 w-full rounded-xl border border-gray-600 py-3 font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-70"
                  onClick={() => handleAuth("signup").catch(() => null)}
                  disabled={authBusy}
                >
                  Crear cuenta nueva
                </button>
              </>
            )}
          </div>
        </div>
      )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onGoHome={() => navigate("home")}
        onCheckout={() => {
          setCartDrawerOpen(false);
          if (!userEmail) {
            navigate("login");
            setToast("Inicia sesión para continuar al pago");
            return;
          }
          goCheckout().catch(() => null);
        }}
        checkingOut={checkingOut}
        userEmail={userEmail}
        products={products}
      />

      {/* Footer */}
      <footer className="bg-gray-950 text-white pt-16 pb-8 border-t-4 border-col-yellow mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center mb-6 cursor-pointer" role="button" tabIndex={0} onClick={() => navigate("home")} onKeyDown={onActivate(() => navigate("home"))} aria-label="Ir al inicio">
                <div className="w-8 h-8 rounded-full bg-col-yellow flex items-center justify-center mr-2">
                  <span className="font-display font-bold text-col-blue text-xs">CF</span>
                </div>
                <span className="font-display font-bold text-xl tracking-wider">CAFETEROS</span>
              </div>
              <p className="text-gray-400 text-sm">Distribuidor autorizado de indumentaria oficial de la Selección Colombia.</p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4 text-gray-200">Productos</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => navigate("home")} className="hover:text-col-yellow transition-colors">Camisetas</button></li>
                <li><button onClick={() => navigate("collections")} className="hover:text-col-yellow transition-colors">Colección</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4 text-gray-200">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => setToast("Próximamente")} className="hover:text-col-yellow transition-colors">Guía de Tallas</button></li>
                <li><button onClick={() => setToast("Próximamente")} className="hover:text-col-yellow transition-colors">Envíos y Devoluciones</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4 text-gray-200">Únete a la pasión</h4>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setToast('¡Suscrito correctamente!'); }}>
                <input type="email" placeholder="Tu correo electrónico" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-col-yellow text-white" />
                <button type="submit" className="bg-col-yellow text-col-blue px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition-colors">
                  Enviar
                </button>
              </form>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>&copy; 2026 La Tricolor Store. Página no oficial de demostración Next.js + Supabase + Wompi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
