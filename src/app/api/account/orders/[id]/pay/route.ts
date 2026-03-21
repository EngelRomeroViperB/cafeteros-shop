import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildWompiCheckoutUrl } from "@/lib/wompi";

function makeReference() {
  return `cafeteros-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, user_id, total_cop, customer_email")
    .eq("id", id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.user_id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ error: "Este pedido ya no está pendiente" }, { status: 400 });
  }

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL;
  if (!redirectBase) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500 });
  }

  const newReference = makeReference();

  const { error: updateError } = await supabase
    .from("orders")
    .update({ reference: newReference, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Error al actualizar referencia" }, { status: 500 });
  }

  const checkoutUrl = buildWompiCheckoutUrl({
    amountInCents: order.total_cop * 100,
    customerEmail: order.customer_email,
    reference: newReference,
    redirectUrl: `${redirectBase}/checkout/result?reference=${newReference}`,
  });

  return NextResponse.json({ checkoutUrl });
}
