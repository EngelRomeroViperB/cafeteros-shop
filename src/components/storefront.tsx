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
import type { CartItem, Product } from "@/types/store";

type Props = {
  products: Product[];
};

type ViewName = "home" | "product" | "cart" | "login";

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

export default function Storefront({ products }: Props) {
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

    setSelectedVariantId(activeProduct.variants[0]?.id ?? null);
    setProductQty(1);
  }, [activeProductId, activeProduct]);

  const navigate = (nextView: ViewName) => {
    setView(nextView);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

    setCart((current) => {
      const index = current.findIndex((item) => item.variantId === variant.id);
      if (index !== -1) {
        const clone = [...current];
        clone[index] = { ...clone[index], qty: clone[index].qty + qty };
        return clone;
      }
      return [
        ...current,
        {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          size: variant.size,
          color: variant.color,
          unitPrice: variant.price_cop,
          qty,
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
          return { ...item, qty: item.qty + delta };
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
      const res = await fetch("/api/checkout/wompi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: userEmail,
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

      {/* Navigation */}
      <nav
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
            </div>

            {/* Íconos de Usuario y Carrito */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <button
                onClick={() => navigate("login")}
                className="text-gray-300 hover:text-col-yellow transition-colors flex items-center gap-2"
              >
                <User className="w-6 h-6" />
                <span className="hidden lg:block font-medium text-sm">{userEmail ? "Mi cuenta" : "Entrar"}</span>
              </button>

              <button
                onClick={() => navigate("cart")}
                className="text-gray-300 hover:text-col-yellow transition-colors relative flex items-center gap-2"
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
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-gray-800 bg-dark-bg px-4 pb-4 pt-3 md:hidden">
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
              <button className="rounded-lg px-3 py-2 text-left text-gray-300 hover:text-col-yellow hover:bg-gray-800" onClick={() => navigate("login")}>
                {userEmail ? "Mi cuenta" : "Entrar"}
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {view === "home" && (
          <div className="page-view block">
            {/* Hero Section */}
            <section
              id="inicio"
              className="relative pt-20 pb-12 lg:pt-[120px] lg:pb-[90px] overflow-hidden hero-pattern min-h-screen flex items-center"
            >
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-col-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 -left-40 w-96 h-96 bg-col-yellow rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-40 left-20 w-96 h-96 bg-col-blue rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="flex flex-col lg:flex-row items-center gap-12">
                  {/* Texto Hero */}
                  <div className="w-full lg:w-1/2 text-center lg:text-left pt-10 lg:pt-0">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
                      <span className="w-2 h-2 rounded-full bg-col-yellow animate-pulse"></span>
                      <span className="text-col-yellow text-sm font-semibold uppercase tracking-wider">
                        Edición Oficial 2026
                      </span>
                    </div>
                    <h1 className="font-display text-5xl lg:text-7xl font-black text-white leading-tight mb-6">
                      NUESTRA PIEL,<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-col-yellow via-yellow-300 to-col-yellow">
                        NUESTRO ORGULLO.
                      </span>
                    </h1>
                    <p className="text-lg lg:text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                      Presentamos la nueva armadura de la Selección Colombia. Diseñada con tecnología de punta y
                      llevando en cada hilo el corazón de 50 millones de colombianos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <button
                        onClick={() => {
                          if (activeProduct?.id) {
                            setActiveProductId(activeProduct.id);
                          }
                          navigate("product");
                        }}
                        className="bg-col-yellow text-col-blue px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(252,209,22,0.4)] flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        Comprar Ahora
                      </button>
                      <button
                        onClick={() => goHomeAndScroll("detalles")}
                        className="px-8 py-4 rounded-full font-bold text-lg text-white border-2 border-white/30 hover:border-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        Ver Detalles
                        <ArrowDown className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Imagen Destacada */}
                  <div
                    className="w-full lg:w-1/2 relative cursor-pointer"
                    onClick={() => {
                      if (activeProduct?.id) {
                        setActiveProductId(activeProduct.id);
                      }
                      navigate("product");
                    }}
                  >
                    <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-gradient-to-tr from-gray-800 to-gray-700 rounded-3xl p-8 shadow-2xl border border-gray-600/50 flex flex-col items-center justify-center transform lg:rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 overflow-hidden group">
                      <div className="absolute top-4 right-4 bg-col-yellow text-col-blue text-xs font-bold px-3 py-1 rounded-full z-20 shadow-md">
                        Clic para ver
                      </div>
                      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center transition-transform duration-500 group-hover:-translate-y-2">
                        <div className="relative w-64 h-72">
                          <ShoppingBag className="w-full h-full text-col-yellow drop-shadow-2xl" strokeWidth={1.5} />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50"></div>
                    </div>
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-col-red rounded-full mix-blend-multiply opacity-50 blur-xl"></div>
                    <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-col-blue rounded-full mix-blend-multiply opacity-50 blur-xl"></div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-3 flex">
                <div className="w-full h-full bg-col-yellow" style={{ flex: 2 }}></div>
                <div className="w-full h-full bg-col-blue" style={{ flex: 1 }}></div>
                <div className="w-full h-full bg-col-red" style={{ flex: 1 }}></div>
              </div>
            </section>

            {/* Detalles */}
            <section id="detalles" className="py-24 bg-white relative">
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
            <section id="tienda" className="py-24 bg-gray-50">
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
                          <ShoppingBag className={`w-32 h-32 drop-shadow-md ${isDark ? "text-gray-800 border-[1px] border-gray-700/50 fill-gray-800 rounded-md" : "text-col-yellow"}`} />
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
        <div className="page-view block pt-28 pb-24 bg-white min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex text-sm text-gray-500 mb-8 items-center gap-2">
              <button onClick={() => navigate("home")} className="hover:text-col-blue">
                Inicio
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">{activeProduct.name}</span>
            </nav>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              {/* Galería de Imagen */}
              <div className="w-full lg:w-1/2">
                <div className="bg-gray-100 rounded-3xl aspect-[4/5] flex items-center justify-center relative shadow-inner overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white opacity-50"></div>
                  <ShoppingBag className="w-64 h-64 text-col-yellow drop-shadow-2xl relative z-10 transform transition-transform duration-700 hover:scale-125" />
                  {activeProduct.badge && (
                    <div className="absolute top-6 left-6 bg-col-red text-white text-xs font-bold px-4 py-1.5 rounded-full z-20 uppercase tracking-wider">
                      {activeProduct.badge}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center border-2 border-col-blue cursor-pointer">
                    <ShoppingBag className="w-10 h-10 text-col-yellow" />
                  </div>
                  <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center border border-gray-200 cursor-pointer hover:border-gray-400">
                    <span className="text-xs font-bold text-gray-400">Dorso</span>
                  </div>
                  <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center border border-gray-200 cursor-pointer hover:border-gray-400">
                    <span className="text-xs font-bold text-gray-400">Detalle</span>
                  </div>
                  <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center border border-gray-200 cursor-pointer hover:border-gray-400">
                    <span className="text-xs font-bold text-gray-400">Escudo</span>
                  </div>
                </div>
              </div>

              {/* Detalles del Producto */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center">
                <div className="mb-6">
                  <h1 className="font-display text-3xl md:text-5xl font-black text-dark-bg mb-2">
                    {activeProduct.name}
                  </h1>
                  <div className="flex items-center gap-4">
                    <p className="text-3xl font-bold text-col-blue">
                      {activeVariant ? formatCOP(activeVariant.price_cop) : "Sin precio"}
                    </p>
                    {activeVariant && activeVariant.stock > 0 && (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        En Stock ({activeVariant.stock})
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  {activeProduct.description}
                </p>

                {/* Tallas (Variantes) */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">Selecciona tu talla y color</h3>
                    <button className="text-col-blue text-sm hover:underline flex items-center gap-1">
                      <Wind className="w-4 h-4" /> Guía de tallas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeProduct.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`rounded-xl py-3 text-center transition-all ${
                          selectedVariantId === variant.id 
                            ? "border-2 border-col-blue bg-blue-50 text-col-blue font-bold shadow-sm" 
                            : "border border-gray-300 font-medium hover:border-col-blue hover:text-col-blue"
                        }`}
                      >
                        {variant.size} - {variant.color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-4 mb-10">
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
                      onClick={() => setProductQty((current) => current + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => addToCart(activeProduct, selectedVariantId ?? undefined, productQty)}
                    disabled={!activeVariant}
                    className="flex-1 bg-col-yellow text-col-blue py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all shadow-[0_8px_20px_rgba(252,209,22,0.3)] hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShoppingBag className="w-5 h-5" /> Agregar al Carrito
                  </button>
                </div>

                {/* Acordeón de información */}
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex justify-between items-center cursor-pointer text-gray-900 hover:text-col-blue font-bold">
                    <span>Detalles del producto</span>
                    <ChevronRight className="w-5 h-5 transform rotate-90" />
                  </div>
                  <div className="flex justify-between items-center cursor-pointer text-gray-900 hover:text-col-blue font-bold">
                    <span>Envíos y devoluciones</span>
                    <ChevronRight className="w-5 h-5 transform rotate-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "cart" && (
        <div className="page-view block pt-28 pb-24 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-display text-3xl font-black text-dark-bg mb-8 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-col-blue" />
              Tu Carrito
            </h1>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Lista de Productos */}
              <div className="w-full lg:w-2/3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="cart-container">
                  {cart.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
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
                        const iconColor = item.color.toLowerCase().includes("negro") ? 'text-gray-800' : 'text-col-yellow';
                        const iconBg = item.color.toLowerCase().includes("negro") ? 'bg-gray-200' : 'bg-yellow-50';
                        
                        return (
                          <div key={item.variantId} className="p-6 flex flex-col sm:flex-row items-center gap-6">
                            <div className={`w-24 h-24 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                              <ShoppingBag className={`w-12 h-12 ${iconColor}`} />
                            </div>
                            
                            <div className="flex-grow text-center sm:text-left">
                              <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                              <p className="text-sm text-gray-500 mb-2">Talla: {item.size} • Color: {item.color}</p>
                              <p className="font-bold text-col-blue">{formatCOP(item.unitPrice)}</p>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                                <button onClick={() => updateQty(item.variantId, -1)} className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-col-blue">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-10 text-center font-bold text-sm">{item.qty}</span>
                                <button onClick={() => updateQty(item.variantId, 1)} className="w-8 h-10 flex items-center justify-center text-gray-500 hover:text-col-blue">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <button onClick={() => removeItem(item.variantId)} className="text-gray-400 hover:text-col-red transition-colors p-2" title="Eliminar">
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
