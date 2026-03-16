"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CartItem, Category, Product, ProductMedia } from "@/types/store";

type Props = {
  products: Product[];
  categories: Category[];
};

type ViewName = "home" | "product" | "cart" | "login" | "collections";

const supabase = createBrowserSupabaseClient();

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getStartingVariant(product: Product) {
  return product.variants[0] ?? null;
}

export default function Storefront({ products, categories }: Props) {
  const [view, setView] = useState<ViewName>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string>("");
  const [activeProductId, setActiveProductId] = useState<string | null>(products[0]?.id ?? null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(products[0]?.variants[0]?.id ?? null);
  const [productQty, setProductQty] = useState(1);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [selectedGender, setSelectedGender] = useState<"Dama" | "Caballero">("Caballero");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) ?? products[0] ?? null,
    [activeProductId, products],
  );
  const activeVariant = useMemo(
    () => activeProduct?.variants.find((variant) => variant.id === selectedVariantId) ?? activeProduct?.variants[0] ?? null,
    [activeProduct, selectedVariantId],
  );

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);

  useEffect(() => {
    const stored = localStorage.getItem("cart:v1");
    if (stored) {
      setCart(JSON.parse(stored) as CartItem[]);
    }

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
    localStorage.setItem("cart:v1", JSON.stringify(cart));
  }, [cart]);

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
    setProductQty(1);
    const primaryIdx = activeProduct.media?.findIndex((m) => m.media_type === "image" && m.is_primary);
    setSelectedMediaIdx(primaryIdx !== undefined && primaryIdx >= 0 ? primaryIdx : 0);
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
    const variant = variantId
      ? product.variants.find((item) => item.id === variantId) ?? null
      : getStartingVariant(product);
    if (!variant) {
      setToast("Producto sin variantes disponibles");
      return;
    }
    if (variant.stock <= 0) {
      setToast("Este producto está agotado");
      return;
    }

    setCart((current) => {
      const index = current.findIndex((item) => item.variantId === variant.id);
      if (index !== -1) {
        const newQty = Math.min(index !== -1 ? current[index].qty + qty : qty, variant.stock);
        if (current[index].qty >= variant.stock) {
          setToast(`Solo hay ${variant.stock} unidades disponibles`);
          return current;
        }
        const clone = [...current];
        clone[index] = { ...clone[index], qty: newQty };
        return clone;
      }
      const primaryMedia = product.media?.find((m) => m.media_type === "image" && m.is_primary);
      const fallbackMedia = product.media?.find((m) => m.media_type === "image");
      const cartImage = primaryMedia?.url ?? fallbackMedia?.url ?? product.image_url ?? null;
      return [
        ...current,
        {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          size: variant.size,
          gender: variant.gender,
          unitPrice: variant.price_cop,
          qty,
          imageUrl: cartImage,
        },
      ];
    });

    setToast("Producto añadido al carrito");
  };

  const updateQty = (variantId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.variantId !== variantId) {
            return item;
          }
          const product = products.find((p) => p.variants.some((v) => v.id === variantId));
          const variant = product?.variants.find((v) => v.id === variantId);
          const maxStock = variant?.stock ?? Infinity;
          const newQty = Math.min(item.qty + delta, maxStock);
          if (delta > 0 && item.qty >= maxStock) {
            setToast(`Solo hay ${maxStock} unidades disponibles`);
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter((item) => item.qty > 0),
    );
  };

  const removeItem = (variantId: string) => {
    setCart((current) => current.filter((item) => item.variantId !== variantId));
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
        : await supabase.auth.signUp({ email: authEmail, password: authPassword });
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
    if (cart.length === 0) {
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
          items: cart,
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
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate("home")}>
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
                className="text-gray-300 hover:text-col-yellow transition-colors font-medium"
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
                onClick={() => goHomeAndScroll("tienda")}
                className="text-gray-300 hover:text-col-yellow transition-colors font-medium"
              >
                Colección
              </button>
              <button
                onClick={() => navigate("collections")}
                className="text-gray-300 hover:text-col-yellow transition-colors font-medium"
              >
                Conjuntos
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
                onClick={() => navigate("cart")}
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
            className="border-t border-gray-800 bg-dark-bg px-4 pb-4 pt-3 md:hidden"
            role="menu"
            onKeyDown={(e) => { if (e.key === "Escape") setMobileMenuOpen(false); }}
          >
            <div className="flex flex-col gap-2">
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => navigate("home")}>
                Inicio
              </button>
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => goHomeAndScroll("detalles")}>
                Innovación
              </button>
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => goHomeAndScroll("tienda")}>
                Colección
              </button>
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => navigate("collections")}>
                Conjuntos
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
                    onClick={() => {
                      if (activeProduct?.id) {
                        setActiveProductId(activeProduct.id);
                      }
                      navigate("product");
                    }}
                  >
                    <div className="relative w-full max-w-[240px] mx-auto aspect-[4/5] bg-gradient-to-tr from-gray-800 to-gray-700 rounded-2xl p-5 shadow-2xl border border-gray-600/50 flex flex-col items-center justify-center transform lg:rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 overflow-hidden group">
                      <div className="absolute top-3 right-3 bg-col-yellow text-col-blue text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-md">
                        Clic para ver
                      </div>
                      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center transition-transform duration-500 group-hover:-translate-y-2">
                        <div className="relative w-32 h-40 flex items-center justify-center">
                          {activeProduct?.image_url ? (
                            <img src={activeProduct.image_url} alt={activeProduct.name} className="w-full h-full object-contain drop-shadow-2xl" />
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
                  }).slice(0, 2).map((product) => {
                    const firstVariant = getStartingVariant(product);
                    const thumb = product.image_url || product.media?.find((m) => m.media_type === "image")?.url;
                    return (
                      <div
                        key={product.id}
                        className="bg-gray-50 rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                        onClick={() => { setActiveProductId(product.id); navigate("product"); }}
                      >
                        <div className="aspect-square md:aspect-[4/5] bg-gray-100 flex items-center justify-center relative overflow-hidden">
                          {thumb ? (
                            <img src={thumb} alt={product.name} className="w-3/4 h-3/4 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <ShoppingBag className="w-24 h-24 text-col-yellow" />
                          )}
                          {product.badge && (
                            <span className="absolute top-4 left-4 bg-col-red text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{product.badge}</span>
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="font-bold text-xl text-dark-bg mb-1">{product.name}</h3>
                          <p className="text-gray-500 text-sm mb-3">{product.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-col-blue text-lg">{firstVariant ? formatCOP(firstVariant.price_cop) : ""}</span>
                            <span className="text-col-blue font-medium text-sm flex items-center gap-1">Ver producto <ArrowRight className="w-4 h-4" /></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tarjeta de Colecciones */}
                  <div
                    className="bg-gradient-to-br from-dark-bg to-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-700 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                    onClick={() => navigate("collections")}
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

            {/* Tienda (Productos Destacados) */}
            <section id="tienda" className="py-14 md:py-24 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-200 pb-6">
                  <div>
                    <h2 className="font-display text-4xl font-black text-dark-bg">La Colección Oficial</h2>
                    <p className="text-gray-600 mt-2">Equípate con lo mejor para alentar a la tricolor.</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span className="text-sm text-gray-500 font-medium">
                      Catálogo conectado a Supabase
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map((product) => {
                    const firstVariant = getStartingVariant(product);
                    const isDark = product.name.toLowerCase().includes("visitante");
                    return (
                      <div
                        key={product.id}
                        className={`bg-white rounded-2xl p-6 shadow-lg border hover:shadow-xl transition-all duration-300 relative group cursor-pointer ${
                          product.badge === "Más Vendida" ? "border-col-yellow" : "border-gray-100"
                        }`}
                        onClick={() => {
                          setActiveProductId(product.id);
                          navigate("product");
                        }}
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
                        
                        <div className={`aspect-square rounded-xl mb-6 flex items-center justify-center overflow-hidden relative group-hover:scale-[1.02] transition-transform ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
                          {(() => {
                            const thumb = product.image_url || product.media?.find((m) => m.media_type === "image")?.url;
                            return thumb ? (
                              <img src={thumb} alt={product.name} className="w-3/4 h-3/4 object-contain drop-shadow-md" />
                            ) : (
                              <ShoppingBag className={`w-32 h-32 drop-shadow-md ${isDark ? "text-gray-800 border-[1px] border-gray-700/50 fill-gray-800 rounded-md" : "text-col-yellow"}`} />
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-xl text-dark-bg">{product.name}</h3>
                            <span className="font-bold text-col-blue text-lg">
                              {firstVariant ? formatCOP(firstVariant.price_cop) : "Sin precio"}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm">{product.description}</p>
                          <div className="pt-4 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
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
                        </div>
                      </div>
                    );
                  })}
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
              {/* Galería de Imagen */}
              <div className="w-full lg:w-1/2">
                {(() => {
                  const rawMedia: ProductMedia[] = activeProduct.media ?? [];
                  const allMedia = rawMedia.filter((m) => !m.gender || m.gender === selectedGender);
                  const hasMedia = allMedia.length > 0;
                  const current = hasMedia ? allMedia[selectedMediaIdx] ?? allMedia[0] : null;
                  const fallbackImg = activeProduct.image_url;

                  return (
                    <>
                      <div className="bg-gray-100 rounded-2xl md:rounded-3xl aspect-square md:aspect-[4/5] flex items-center justify-center relative shadow-inner overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white opacity-50"></div>
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
                            <img src={current.url} alt={activeProduct.name} className="w-3/4 h-3/4 object-contain drop-shadow-2xl relative z-10 transform transition-transform duration-700 hover:scale-125" />
                          )
                        ) : fallbackImg ? (
                          <img src={fallbackImg} alt={activeProduct.name} className="w-3/4 h-3/4 object-contain drop-shadow-2xl relative z-10 transform transition-transform duration-700 hover:scale-125" />
                        ) : (
                          <ShoppingBag className="w-64 h-64 text-col-yellow drop-shadow-2xl relative z-10 transform transition-transform duration-700 hover:scale-125" />
                        )}
                        {activeProduct.badge && (
                          <div className="absolute top-6 left-6 bg-col-red text-white text-xs font-bold px-4 py-1.5 rounded-full z-20 uppercase tracking-wider">
                            {activeProduct.badge}
                          </div>
                        )}
                      </div>
                      {hasMedia && allMedia.length > 1 && (
                        <div className="grid grid-cols-4 gap-2 md:gap-4 mt-3 md:mt-4">
                          {allMedia.map((m, idx) => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMediaIdx(idx)}
                              className={`bg-gray-100 rounded-xl aspect-square flex items-center justify-center cursor-pointer overflow-hidden ${
                                idx === selectedMediaIdx ? "border-2 border-col-blue" : "border border-gray-200 hover:border-gray-400"
                              }`}
                            >
                              {m.media_type === "video" ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-gray-200">
                                  <span className="text-xs font-bold text-gray-500">▶ Video</span>
                                </div>
                              ) : (
                                <img src={m.url} alt="" className="w-3/4 h-3/4 object-contain" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Detalles del Producto */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center">
                <div className="mb-6">
                  <h1 className="font-display text-2xl md:text-3xl lg:text-5xl font-black text-dark-bg mb-2">
                    {activeProduct.name}
                  </h1>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl md:text-3xl font-bold text-col-blue">
                      {activeVariant ? formatCOP(activeVariant.price_cop) : "Sin precio"}
                    </p>
                    {activeVariant && activeVariant.stock > 0 && (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        En Stock ({activeVariant.stock})
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mb-4 md:mb-8 text-base md:text-lg leading-relaxed">
                  {activeProduct.description}
                </p>

                {/* Paso 1: Género */}
                {(() => {
                  const availableGenders = [...new Set(activeProduct.variants.map((v) => v.gender))];
                  const sizesForGender = activeProduct.variants.filter((v) => v.gender === selectedGender);
                  return (
                    <>
                      <div className="mb-6">
                        <h3 className="font-bold text-gray-900 mb-3">Selecciona el género</h3>
                        <div className="flex gap-3">
                          {availableGenders.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                setSelectedGender(g);
                                setSelectedMediaIdx(0);
                                const firstWithStock = activeProduct.variants.find((v) => v.gender === g && v.stock > 0) ?? activeProduct.variants.find((v) => v.gender === g);
                                setSelectedVariantId(firstWithStock?.id ?? null);
                                setProductQty(1);
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

                      {/* Paso 2: Talla */}
                      <div className="mb-8">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-gray-900">Selecciona tu talla</h3>
                          <button className="text-col-blue text-sm hover:underline flex items-center gap-1">
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
                                onClick={() => setSelectedVariantId(variant.id)}
                                className={`min-w-[56px] rounded-xl py-3 px-4 text-center transition-all ${
                                  outOfStock
                                    ? "border border-gray-200 text-gray-300 cursor-not-allowed line-through"
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
                          <p className="text-gray-400 text-sm mt-2">No hay tallas disponibles para {selectedGender}.</p>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Acciones */}
                <div className="flex gap-3 md:gap-4 mb-6 md:mb-10">
                  <div className="flex items-center border border-gray-300 rounded-xl bg-white w-32">
                    <button 
                      className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-col-blue"
                      onClick={() => setProductQty((current) => Math.max(1, current - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input 
                      type="text" 
                      value={productQty} 
                      className="w-full text-center font-bold focus:outline-none" 
                      readOnly 
                    />
                    <button 
                      className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-col-blue"
                      onClick={() => setProductQty((current) => activeVariant ? Math.min(current + 1, activeVariant.stock) : current + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => addToCart(activeProduct, selectedVariantId ?? undefined, productQty)}
                    disabled={!activeVariant}
                    className="flex-1 bg-col-yellow text-col-blue py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:bg-yellow-400 transition-all shadow-[0_8px_20px_rgba(252,209,22,0.3)] hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShoppingBag className="w-5 h-5" /> Agregar al Carrito
                  </button>
                </div>

                {/* Acordeón de información */}
                <div className="border-t border-gray-200 pt-6 space-y-0 divide-y divide-gray-200">
                  <div>
                    <button
                      onClick={() => setOpenAccordion(openAccordion === "details" ? null : "details")}
                      className="flex justify-between items-center w-full py-4 text-gray-900 hover:text-col-blue font-bold"
                      aria-expanded={openAccordion === "details"}
                    >
                      <span>Detalles del producto</span>
                      <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openAccordion === "details" ? "rotate-90" : "rotate-0"}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openAccordion === "details" ? "max-h-60 pb-4" : "max-h-0"}`}>
                      <p className="text-gray-600 text-sm leading-relaxed">{activeProduct.description || "Producto de alta calidad diseñado para el máximo rendimiento y comodidad."}</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => setOpenAccordion(openAccordion === "shipping" ? null : "shipping")}
                      className="flex justify-between items-center w-full py-4 text-gray-900 hover:text-col-blue font-bold"
                      aria-expanded={openAccordion === "shipping"}
                    >
                      <span>Envíos y devoluciones</span>
                      <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${openAccordion === "shipping" ? "rotate-90" : "rotate-0"}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openAccordion === "shipping" ? "max-h-60 pb-4" : "max-h-0"}`}>
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
              {/* Lista de Productos */}
              <div className="w-full lg:w-2/3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="cart-container">
                  {cart.length === 0 ? (
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
                    <div className="divide-y divide-gray-100">
                      {cart.map((item) => {
                        const iconColor = item.gender === "Dama" ? 'text-pink-500' : 'text-col-yellow';
                        const iconBg = item.gender === "Dama" ? 'bg-pink-50' : 'bg-yellow-50';
                        
                        return (
                          <div key={item.variantId} className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                            <div className={`w-20 h-20 md:w-24 md:h-24 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <ShoppingBag className={`w-12 h-12 ${iconColor}`} />
                              )}
                            </div>
                            
                            <div className="flex-grow text-center sm:text-left">
                              <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                              <p className="text-sm text-gray-500 mb-2">Talla: {item.size} • {item.gender}</p>
                              <p className="font-bold text-col-blue">{formatCOP(item.unitPrice)}</p>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                                <button onClick={() => updateQty(item.variantId, -1)} className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-col-blue" aria-label={`Reducir cantidad de ${item.name}`}>
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-10 text-center font-bold text-sm">{item.qty}</span>
                                <button onClick={() => updateQty(item.variantId, 1)} className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-col-blue" aria-label={`Aumentar cantidad de ${item.name}`}>
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <button onClick={() => removeItem(item.variantId)} className="text-gray-400 hover:text-col-red transition-colors p-2" title="Eliminar" aria-label={`Eliminar ${item.name} del carrito`}>
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen del Pedido */}
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
                    disabled={checkingOut || cart.length === 0}
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
              <span className="text-gray-900 font-medium">Colecciones</span>
            </nav>

            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-14">
              <h1 className="font-display text-2xl md:text-4xl font-black text-dark-bg mb-3">Conjuntos Deportivos</h1>
              <p className="text-gray-500">Equipamiento completo para entrenar y competir con estilo.</p>
            </div>

            {(() => {
              const conjuntoCat = categories.find((c) => c.slug === "conjuntos");
              const collectionProducts = conjuntoCat
                ? products.filter((p) => p.category_id === conjuntoCat.id)
                : [];

              if (collectionProducts.length === 0) {
                return (
                  <div className="text-center py-20">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Próximamente</h3>
                    <p className="text-gray-500 mb-6">Estamos preparando conjuntos deportivos exclusivos.</p>
                    <button onClick={() => navigate("home")} className="bg-col-blue text-white px-6 py-3 rounded-full font-medium hover:bg-blue-800 transition-colors">
                      Volver al Inicio
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {collectionProducts.map((product) => {
                    const firstVariant = getStartingVariant(product);
                    const thumb = product.image_url || product.media?.find((m) => m.media_type === "image")?.url;
                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                        onClick={() => { setActiveProductId(product.id); navigate("product"); }}
                      >
                        {product.badge && (
                          <div className="absolute top-4 right-4 bg-col-red text-white text-xs font-bold px-3 py-1 rounded-full z-10">{product.badge}</div>
                        )}
                        <div className="aspect-square rounded-xl mb-6 flex items-center justify-center overflow-hidden bg-gray-100 group-hover:scale-[1.02] transition-transform">
                          {thumb ? (
                            <img src={thumb} alt={product.name} className="w-3/4 h-3/4 object-contain drop-shadow-md" />
                          ) : (
                            <ShoppingBag className="w-32 h-32 text-col-yellow" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-bold text-xl text-dark-bg">{product.name}</h3>
                          <p className="text-gray-500 text-sm">{product.description}</p>
                          <div className="flex justify-between items-center pt-2">
                            <span className="font-bold text-col-blue text-lg">{firstVariant ? formatCOP(firstVariant.price_cop) : ""}</span>
                            <span className="text-col-blue font-medium text-sm flex items-center gap-1">Ver producto <ArrowRight className="w-4 h-4" /></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              <div className="w-16 h-16 rounded-full bg-col-yellow mx-auto flex items-center justify-center mb-4 border-2 border-col-blue shadow-[0_0_15px_rgba(252,209,22,0.4)] cursor-pointer" onClick={() => navigate("home")}>
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
                      <a href="#" className="text-col-yellow text-xs hover:underline">¿Olvidaste tu contraseña?</a>
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

      {/* Footer */}
      <footer className="bg-gray-950 text-white pt-16 pb-8 border-t-4 border-col-yellow mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center mb-6 cursor-pointer" onClick={() => navigate("home")}>
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
                <li><button onClick={() => goHomeAndScroll("tienda")} className="hover:text-col-yellow transition-colors">Colección</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4 text-gray-200">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-col-yellow transition-colors">Guía de Tallas</a></li>
                <li><a href="#" className="hover:text-col-yellow transition-colors">Envíos y Devoluciones</a></li>
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
