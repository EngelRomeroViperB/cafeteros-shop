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

  // Verify the item belongs to this order
  const { data: item, error: fetchErr } = await supabase
    .from("order_items")
    .select("id, order_id, selected_size, selected_gender")
    .eq("id", itemId)
    .eq("order_id", orderId)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json(
      { error: "Item no encontrado en este pedido" },
      { status: 404 },
    );
  }

  const updateFields: Record<string, string> = {};
  if (new_size) updateFields.selected_size = new_size;
  if (new_gender) updateFields.selected_gender = new_gender;

  const { data, error } = await supabase
    .from("order_items")
    .update(updateFields)
    .eq("id", itemId)
    .select("id, selected_size, selected_gender")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
