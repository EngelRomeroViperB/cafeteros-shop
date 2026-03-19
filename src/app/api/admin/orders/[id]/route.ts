import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (!body.status) {
    return NextResponse.json({ error: "Status requerido" }, { status: 400 });
  }

  const validStatuses = ["pending", "paid", "shipped", "delivered", "canceled"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

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
