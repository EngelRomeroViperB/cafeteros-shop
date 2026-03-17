import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRate } from "@/lib/rate-limit";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdminKey(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  if (!checkAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] POST /api/admin/media — IP: ${ip}`);
    return unauthorized();
  }

  const body = await req.json();

  if (!body.product_id) return NextResponse.json({ error: "product_id es requerido" }, { status: 400 });
  if (!body.url || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "URL es requerida" }, { status: 400 });
  }
  if (body.gender && !["Dama", "Caballero"].includes(body.gender)) {
    return NextResponse.json({ error: "G\u00e9nero debe ser Dama o Caballero" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_media")
    .insert({
      product_id: body.product_id,
      url: body.url,
      media_type: body.media_type ?? "image",
      sort_order: body.sort_order ?? 0,
      is_primary: body.is_primary ?? false,
      gender: body.gender ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ media: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  if (!checkAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] PATCH /api/admin/media — IP: ${ip}`);
    return unauthorized();
  }

  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  // Unset all other primary flags for this product first
  if (body.is_primary) {
    await supabase
      .from("product_media")
      .update({ is_primary: false })
      .eq("product_id", body.product_id);
  }

  const { data, error } = await supabase
    .from("product_media")
    .update({ is_primary: body.is_primary })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ media: data });
}

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  if (!checkAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] DELETE /api/admin/media — IP: ${ip}`);
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("product_media").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
