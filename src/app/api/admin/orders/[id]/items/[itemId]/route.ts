import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id: orderId, itemId } = await params;
  const body = await request.json();

  const { new_size, new_gender } = body as {
    new_size?: string;
    new_gender?: string;
  };

  if (!new_size && !new_gender) {
    return NextResponse.json(
      { error: "Debes enviar new_size o new_gender" },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  // 1. Fetch the order item with its current variant info
  const { data: item, error: fetchErr } = await supabase
    .from("order_items")
    .select("id, order_id, product_id, variant_id, selected_size, selected_gender, quantity")
    .eq("id", itemId)
    .eq("order_id", orderId)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json(
      { error: "Item no encontrado en este pedido" },
      { status: 404 },
    );
  }

  // 2. Verify the order is in a valid state for size change (only paid/shipped)
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (!["paid", "shipped"].includes(order.status)) {
    return NextResponse.json(
      { error: `No se puede cambiar talla en un pedido con estado "${order.status}". Solo pedidos pagados o enviados.` },
      { status: 400 },
    );
  }

  const finalSize = new_size || item.selected_size;
  const finalGender = new_gender || item.selected_gender;

  // If nothing actually changed, skip
  if (finalSize === item.selected_size && finalGender === item.selected_gender) {
    return NextResponse.json(
      { error: "La talla y género seleccionados son iguales a los actuales" },
      { status: 400 },
    );
  }

  // 3. Find the NEW variant (same product, new size+gender)
  const { data: newVariant, error: newVarErr } = await supabase
    .from("product_variants")
    .select("id, stock, price_cop")
    .eq("product_id", item.product_id)
    .eq("size", finalSize)
    .eq("gender", finalGender)
    .eq("is_active", true)
    .single();

  if (newVarErr || !newVariant) {
    return NextResponse.json(
      { error: `No existe variante activa para talla ${finalSize} / ${finalGender} en este producto` },
      { status: 400 },
    );
  }

  // 4. Verify new variant has enough stock
  if (newVariant.stock < item.quantity) {
    return NextResponse.json(
      { error: `Stock insuficiente para ${finalSize}/${finalGender}: disponible ${newVariant.stock}, necesario ${item.quantity}` },
      { status: 400 },
    );
  }

  // 5. Restore stock to the OLD variant (+quantity)
  if (item.variant_id) {
    const { data: oldVariant } = await supabase
      .from("product_variants")
      .select("id, stock")
      .eq("id", item.variant_id)
      .single();

    if (oldVariant) {
      const { error: restoreErr } = await supabase
        .from("product_variants")
        .update({ stock: oldVariant.stock + item.quantity })
        .eq("id", oldVariant.id);

      if (restoreErr) {
        console.error("[SIZE CHANGE] Failed to restore old stock:", restoreErr.message);
        return NextResponse.json(
          { error: "Error al devolver stock de la talla anterior" },
          { status: 500 },
        );
      }
    }
  }

  // 6. Decrement stock from the NEW variant (-quantity)
  const { error: decrementErr } = await supabase.rpc("decrement_stock", {
    p_variant_id: newVariant.id,
    p_qty: item.quantity,
  });

  if (decrementErr) {
    // Rollback: try to restore old variant stock back
    if (item.variant_id) {
      const { data: oldVar } = await supabase
        .from("product_variants")
        .select("id, stock")
        .eq("id", item.variant_id)
        .single();
      if (oldVar) {
        await supabase
          .from("product_variants")
          .update({ stock: oldVar.stock - item.quantity })
          .eq("id", oldVar.id);
      }
    }
    console.error("[SIZE CHANGE] Failed to decrement new stock:", decrementErr.message);
    return NextResponse.json(
      { error: "Error al descontar stock de la nueva talla" },
      { status: 500 },
    );
  }

  // 7. Update the order item with new size, gender, variant_id, and price
  const { data: updated, error: updateErr } = await supabase
    .from("order_items")
    .update({
      selected_size: finalSize,
      selected_gender: finalGender,
      variant_id: newVariant.id,
      unit_price_cop: newVariant.price_cop,
      line_total_cop: newVariant.price_cop * item.quantity,
    })
    .eq("id", itemId)
    .select("id, selected_size, selected_gender, variant_id, unit_price_cop, line_total_cop")
    .single();

  if (updateErr) {
    console.error("[SIZE CHANGE] Failed to update order_item:", updateErr.message);
    return NextResponse.json({ error: "Error al actualizar el item del pedido" }, { status: 500 });
  }

  return NextResponse.json({
    item: updated,
    message: `Talla cambiada de ${item.selected_size}/${item.selected_gender} a ${finalSize}/${finalGender}`,
  });
}
