import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.user_id !== userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ error: "Solo se pueden cancelar pedidos pendientes" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
