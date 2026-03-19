"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago aprobado",
  declined: "Pago rechazado",
  canceled: "Pago anulado",
  error: "Pago con error",
  pending: "Pago pendiente",
};

const STATUS_ICONS: Record<string, string> = {
  paid: "✅",
  declined: "❌",
  canceled: "🚫",
  error: "⚠️",
  pending: "⏳",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "text-green-400",
  declined: "text-red-400",
  canceled: "text-orange-400",
  error: "text-red-400",
  pending: "text-yellow-400",
};

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState("pending");
  const [totalCop, setTotalCop] = useState<number | null>(null);
  const [polling, setPolling] = useState(true);
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 45; // ~3 minutes at 4s intervals

  const fetchStatus = useCallback(async () => {
    if (!reference) return;
    try {
      const res = await fetch(`/api/checkout/status?reference=${encodeURIComponent(reference)}`);
      if (!res.ok) return;
      const data = await res.json();
      const orderStatus = data.order?.status ?? "pending";
      setStatus(orderStatus);
      setTotalCop(data.order?.total_cop ?? null);

      if (orderStatus !== "pending") {
        setPolling(false);
      }
    } catch {
      // silently ignore fetch errors during polling
    }
  }, [reference]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!polling || !reference) return;

    const interval = setInterval(() => {
      setAttempts((prev) => {
        if (prev >= MAX_ATTEMPTS) {
          setPolling(false);
          return prev;
        }
        fetchStatus();
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [polling, reference, fetchStatus]);

  const label = STATUS_LABELS[status] ?? "Estado desconocido";
  const icon = STATUS_ICONS[status] ?? "❓";
  const color = STATUS_COLORS[status] ?? "text-slate-400";

  const formatCOP = (value: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);

  return (
    <main className="hero-pattern flex min-h-screen items-center justify-center px-4 py-20 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-950/90 p-8 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-wider text-[#FCD116]">Resultado de pago</p>

        <div className="mt-4 text-5xl">{icon}</div>
        <h1 className={`mt-3 text-3xl font-black ${color}`}>{label}</h1>

        {reference && (
          <p className="mt-4 text-slate-300">
            Referencia: <span className="font-semibold text-white break-all">{reference}</span>
          </p>
        )}

        {totalCop !== null && (
          <p className="mt-2 text-slate-300">
            Total: <span className="font-bold text-white">{formatCOP(totalCop)}</span>
          </p>
        )}

        {status === "pending" && polling && (
          <div className="mt-6">
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <svg className="animate-spin h-4 w-4 text-[#FCD116]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Esperando confirmación de Wompi...
            </div>
          </div>
        )}

        {status === "pending" && !polling && (
          <p className="mt-4 text-sm text-slate-400">
            El pago sigue pendiente. Se actualizará automáticamente cuando Wompi confirme la transacción.
          </p>
        )}

        {status === "paid" && (
          <p className="mt-4 text-sm text-green-300">
            ¡Tu pago fue confirmado exitosamente! Puedes ver el estado de tu pedido en la sección <strong>Mis Pedidos</strong> de tu cuenta.
          </p>
        )}

        {(status === "declined" || status === "error") && (
          <p className="mt-4 text-sm text-red-300">
            Hubo un problema con tu pago. Puedes intentar de nuevo o contactarnos para asistencia.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="rounded-xl bg-[#FCD116] px-6 py-3 font-bold text-[#003893]">
            Volver a la tienda
          </Link>
          <Link href="/" className="rounded-xl border border-slate-600 px-6 py-3 font-semibold text-white">
            Seguir comprando
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <main className="hero-pattern flex min-h-screen items-center justify-center px-4 py-20 text-white">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-slate-400">
              <svg className="animate-spin h-5 w-5 text-[#FCD116]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cargando resultado...
            </div>
          </div>
        </main>
      }
    >
      <CheckoutResultContent />
    </Suspense>
  );
}
