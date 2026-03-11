"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Leaf,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  Wind,
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string>("");
  const [activeProductId, setActiveProductId] = useState<string | null>(products[0]?.id ?? null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) ?? products[0] ?? null,
    [activeProductId, products],
  );

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);

  useEffect(() => {
    const stored = localStorage.getItem("cart:v1");
    if (stored) {
      setCart(JSON.parse(stored) as CartItem[]);
    }

    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      });
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

  const addToCart = (product: Product) => {
    const variant = getStartingVariant(product);
    if (!variant) {
      setToast("Producto sin variantes disponibles");
      return;
    }

    setCart((current) => {
      const index = current.findIndex((item) => item.variantId === variant.id);
      if (index !== -1) {
        const clone = [...current];
        clone[index] = { ...clone[index], qty: clone[index].qty + 1 };
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
          qty: 1,
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

    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : await supabase.auth.signUp({ email: authEmail, password: authPassword });

    if (response.error) {
      setToast(response.error.message);
      return;
    }

    setUserEmail(authEmail);
    setView("cart");
    setToast(mode === "login" ? "Sesión iniciada" : "Cuenta creada");
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
    <div className="bg-slate-50 text-slate-800">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button className="flex items-center gap-3" onClick={() => setView("home")}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#003893] bg-[#FCD116] font-black text-[#003893]">
              FCF
            </span>
            <span className="hidden font-bold tracking-wider text-white sm:block">LA TRICOLOR</span>
          </button>

          <div className="hidden items-center gap-8 md:flex">
            <button className="text-slate-300 hover:text-[#FCD116]" onClick={() => setView("home")}>Inicio</button>
            <a className="text-slate-300 hover:text-[#FCD116]" href="#detalles">Innovación</a>
            <a className="text-slate-300 hover:text-[#FCD116]" href="#tienda">Colección</a>
          </div>

          <div className="flex items-center gap-5">
            <button className="flex items-center gap-2 text-slate-300 hover:text-[#FCD116]" onClick={() => setView("login")}>
              <User className="h-5 w-5" />
              <span className="hidden text-sm lg:block">{userEmail ? "Cuenta" : "Entrar"}</span>
            </button>
            <button className="relative flex items-center gap-2 text-slate-300 hover:text-[#FCD116]" onClick={() => setView("cart")}>
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden text-sm lg:block">Carrito</span>
              <span
                className={`absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-[#CE1126] text-[10px] font-bold text-white transition ${
                  totalItems ? "scale-100" : "scale-0"
                }`}
              >
                {totalItems}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {view === "home" && (
        <main>
          <section className="hero-pattern relative flex min-h-screen items-center overflow-hidden pb-12 pt-24 lg:pb-20 lg:pt-32">
            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:px-8">
              <div className="w-full text-center lg:w-1/2 lg:text-left">
                <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-[#FCD116]">
                  Edición Oficial 2026
                </span>
                <h1 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">
                  NUESTRA PIEL,
                  <br />
                  <span className="bg-gradient-to-r from-[#FCD116] via-yellow-300 to-[#FCD116] bg-clip-text text-transparent">NUESTRO ORGULLO.</span>
                </h1>
                <p className="mb-8 text-lg text-slate-300">
                  La camiseta oficial de la selección, con catálogo editable desde Supabase y checkout completo con Wompi.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  <button
                    onClick={() => {
                      if (activeProduct?.id) {
                        setActiveProductId(activeProduct.id);
                      }
                      setView("product");
                    }}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#FCD116] px-8 py-4 font-bold text-[#003893] transition hover:scale-[1.02]"
                  >
                    <ShoppingBag className="h-5 w-5" /> Comprar Ahora
                  </button>
                  <a href="#detalles" className="flex items-center justify-center gap-2 rounded-full border border-white/30 px-8 py-4 font-bold text-white">
                    Ver Detalles <ArrowDown className="h-5 w-5" />
                  </a>
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="rounded-3xl border border-slate-600/50 bg-gradient-to-tr from-slate-800 to-slate-700 p-8 shadow-2xl">
                  <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-slate-900/40">
                    <ShoppingBag className="h-36 w-36 text-[#FCD116]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="detalles" className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-12 text-center">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#CE1126]">Tecnología de Alto Rendimiento</h2>
                <h3 className="mt-2 text-4xl font-black text-slate-900">Diseñada para hacer historia</h3>
              </div>
              <div className="grid gap-8 md:grid-cols-3">
                <article className="rounded-2xl border border-slate-100 p-6 text-center">
                  <Wind className="mx-auto mb-4 h-10 w-10 text-[#003893]" />
                  <h4 className="font-bold">Tecnología Aero-Fresh</h4>
                </article>
                <article className="rounded-2xl border border-slate-100 p-6 text-center">
                  <Leaf className="mx-auto mb-4 h-10 w-10 text-yellow-600" />
                  <h4 className="font-bold">Materiales Reciclados</h4>
                </article>
                <article className="rounded-2xl border border-slate-100 p-6 text-center">
                  <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[#CE1126]" />
                  <h4 className="font-bold">Ajuste Ergonómico</h4>
                </article>
              </div>
            </div>
          </section>

          <section id="tienda" className="bg-slate-50 py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
                <div>
                  <h2 className="text-4xl font-black text-slate-900">La Colección Oficial</h2>
                  <p className="text-slate-600">Catálogo editable desde Supabase.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const firstVariant = getStartingVariant(product);
                  return (
                    <article key={product.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-lg">
                      <div className="mb-6 flex aspect-square items-center justify-center rounded-xl bg-slate-100">
                        <ShoppingBag className="h-20 w-20 text-[#FCD116]" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                          <span className="font-bold text-[#003893]">{firstVariant ? formatCOP(firstVariant.price_cop) : "Sin precio"}</span>
                        </div>
                        <p className="text-sm text-slate-500">{product.description}</p>
                        <div className="pt-4">
                          <button
                            onClick={() => {
                              setActiveProductId(product.id);
                              setView("product");
                            }}
                            className="mb-2 w-full rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-900"
                          >
                            Ver producto
                          </button>
                          <button
                            onClick={() => addToCart(product)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white"
                          >
                            <ShoppingCart className="h-4 w-4" /> Añadir rápido
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      )}

      {view === "product" && activeProduct && (
        <main className="min-h-screen bg-white pb-24 pt-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
              <button onClick={() => setView("home")} className="hover:text-[#003893]">Inicio</button>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900">{activeProduct.name}</span>
            </nav>

            <div className="grid gap-12 lg:grid-cols-2">
              <div className="flex aspect-[4/5] items-center justify-center rounded-3xl bg-slate-100 shadow-inner">
                <ShoppingBag className="h-48 w-48 text-[#FCD116]" />
              </div>

              <div>
                <h1 className="text-4xl font-black text-slate-900">{activeProduct.name}</h1>
                <p className="mt-3 text-slate-600">{activeProduct.description}</p>
                <p className="mt-4 text-3xl font-bold text-[#003893]">
                  {activeProduct.variants[0] ? formatCOP(activeProduct.variants[0].price_cop) : "Sin precio"}
                </p>

                <div className="mt-8 space-y-3">
                  {activeProduct.variants.map((variant) => (
                    <div key={variant.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <span className="font-medium text-slate-900">Talla {variant.size} · {variant.color}</span>
                      <span className="font-bold text-[#003893]">{formatCOP(variant.price_cop)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addToCart(activeProduct)}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FCD116] py-4 text-lg font-bold text-[#003893]"
                >
                  <ShoppingBag className="h-5 w-5" /> Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === "cart" && (
        <main className="min-h-screen bg-slate-50 pb-24 pt-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-8 flex items-center gap-3 text-3xl font-black text-slate-900">
              <ShoppingCart className="h-8 w-8 text-[#003893]" /> Tu Carrito
            </h1>

            <div className="grid gap-8 lg:grid-cols-3">
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white lg:col-span-2">
                {cart.length === 0 ? (
                  <div className="p-12 text-center">
                    <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-900">Tu carrito está vacío</h2>
                    <button className="mt-6 rounded-full bg-[#003893] px-6 py-3 font-medium text-white" onClick={() => setView("home")}>Seguir comprando</button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <article key={item.variantId} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900">{item.name}</h3>
                          <p className="text-sm text-slate-500">Talla: {item.size} · Color: {item.color}</p>
                          <p className="font-bold text-[#003893]">{formatCOP(item.unitPrice)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="rounded border border-slate-300 p-2" onClick={() => updateQty(item.variantId, -1)}>
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-8 text-center font-bold">{item.qty}</span>
                          <button className="rounded border border-slate-300 p-2" onClick={() => updateQty(item.variantId, 1)}>
                            <Plus className="h-4 w-4" />
                          </button>
                          <button className="ml-2 rounded p-2 text-slate-400 hover:text-[#CE1126]" onClick={() => removeItem(item.variantId)}>
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="mb-6 text-lg font-bold text-slate-900">Resumen del Pedido</h2>
                <div className="space-y-4 text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">{formatCOP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Envío</span>
                    <span className="font-medium text-slate-900">Por calcular</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="text-2xl font-black text-[#003893]">{formatCOP(subtotal)}</span>
                  </div>
                </div>

                <button
                  onClick={goCheckout}
                  disabled={checkingOut}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#003893] py-4 text-lg font-bold text-white disabled:opacity-60"
                >
                  {checkingOut ? "Creando pago..." : "Proceder al Pago"} <ArrowRight className="h-5 w-5" />
                </button>

                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Lock className="h-4 w-4" /> Pago seguro con Wompi
                </p>
              </aside>
            </div>
          </div>
        </main>
      )}

      {view === "login" && (
        <main className="hero-pattern flex min-h-screen items-center justify-center px-4 py-24">
          <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-8 shadow-2xl">
            <h1 className="text-center text-2xl font-bold text-white">Inicia Sesión</h1>
            <p className="mt-2 text-center text-sm text-slate-400">Accede para continuar con tu compra</p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleAuth("login").catch(() => null);
              }}
              className="mt-8 space-y-4"
            >
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                type="email"
                placeholder="hincha@colombia.com"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                required
              />

              <button className="w-full rounded-xl bg-[#FCD116] py-3.5 text-lg font-bold text-[#003893]" type="submit">
                Entrar a la Tribuna
              </button>
            </form>

            <button className="mt-4 w-full rounded-xl border border-slate-600 py-3 font-semibold text-white" onClick={() => handleAuth("signup").catch(() => null)}>
              Crear cuenta
            </button>
          </section>
        </main>
      )}

      <footer className="border-t-4 border-[#FCD116] bg-slate-950 py-8 text-center text-sm text-slate-500">
        © 2026 La Tricolor Store. Demo con Next.js + Supabase + Wompi.
      </footer>

      <div
        className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-white shadow-2xl transition ${
          toast ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
        }`}
      >
        <span className="rounded-full bg-green-500/20 p-1.5 text-green-400">
          <Check className="h-4 w-4" />
        </span>
        <p className="font-medium">{toast || "ok"}</p>
      </div>
    </div>
  );
}
