import Link from "next/link";

type Props = {
  searchParams: Promise<{
    reference?: string;
    status?: string;
  }>;
};

const statusLabel: Record<string, string> = {
  APPROVED: "Pago aprobado",
  DECLINED: "Pago rechazado",
  ERROR: "Pago con error",
  VOIDED: "Pago anulado",
  PENDING: "Pago pendiente",
};

export default async function CheckoutResultPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? "PENDING";
  const label = statusLabel[status] ?? "Estado pendiente de confirmación";

  return (
    <main className="hero-pattern flex min-h-screen items-center justify-center px-4 py-20 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-950/90 p-8 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-wider text-[#FCD116]">Resultado de pago</p>
        <h1 className="mt-2 text-3xl font-black">{label}</h1>
        <p className="mt-4 text-slate-300">
          Referencia: <span className="font-semibold text-white">{params.reference ?? "sin referencia"}</span>
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Si el estado queda pendiente, se actualizará cuando Wompi confirme la transacción por webhook.
        </p>

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
