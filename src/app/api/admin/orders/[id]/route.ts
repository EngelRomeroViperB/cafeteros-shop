import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (!body.status) {
    return NextResponse.json({ error: "Status requerido" }, { status: 400 });
  }

  const validStatuses = ["pending", "paid", "shipped", "delivered", "canceled", "returned"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: currentOrder, error: currentOrderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .single();

  if (currentOrderError || !currentOrder) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const previousStatus = currentOrder.status;
  const nextStatus = body.status as string;

  const alreadyClosed = previousStatus === "canceled" || previousStatus === "returned";
  const shouldRestock =
    (nextStatus === "canceled" || nextStatus === "returned")
    && !alreadyClosed
    && ["paid", "shipped", "delivered"].includes(previousStatus);

  if (shouldRestock) {
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", id);

    if (itemsError) {
      return NextResponse.json({ error: "No se pudieron cargar los ítems para reposición" }, { status: 500 });
    }

    for (const item of items ?? []) {
      if (!item.variant_id || !item.quantity) continue;
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("id, stock")
        .eq("id", item.variant_id)
        .single();

      if (variantError || !variant) {
        return NextResponse.json({ error: "No se pudo reponer stock de una variante" }, { status: 500 });
      }

      const { error: restockError } = await supabase
        .from("product_variants")
        .update({ stock: variant.stock + item.quantity })
        .eq("id", variant.id);

      if (restockError) {
        return NextResponse.json({ error: "Error al reponer stock" }, { status: 500 });
      }
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
