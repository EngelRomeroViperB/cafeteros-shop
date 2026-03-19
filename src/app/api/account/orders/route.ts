import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, reference, status, wompi_status, total_cop, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderIds = (orders ?? []).map((o) => o.id);

  const { data: items } = orderIds.length > 0
    ? await supabase
        .from("order_items")
        .select("id, order_id, title, selected_size, selected_gender, quantity, unit_price_cop, line_total_cop")
        .in("order_id", orderIds)
    : { data: [] };

  const ordersWithItems = (orders ?? []).map((order) => ({
    ...order,
    items: (items ?? []).filter((item) => item.order_id === order.id),
  }));

  return NextResponse.json({ orders: ordersWithItems });
}
