import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderIds = (orders ?? []).map((o) => o.id);

  const { data: items } = orderIds.length > 0
    ? await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
    : { data: [] };

  const ordersWithItems = (orders ?? []).map((order) => ({
    ...order,
    items: (items ?? []).filter((item) => item.order_id === order.id),
  }));

  return NextResponse.json({ orders: ordersWithItems });
}
