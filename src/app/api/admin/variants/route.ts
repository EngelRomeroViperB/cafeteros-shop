import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdminKey(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: body.product_id,
      size: body.size,
      color: body.color,
      price_cop: body.price_cop,
      stock: body.stock ?? 0,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ variant: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .update({
      size: body.size,
      color: body.color,
      price_cop: body.price_cop,
      stock: body.stock ?? 0,
      is_active: body.is_active ?? true,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ variant: data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("product_variants").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
