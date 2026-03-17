import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRate } from "@/lib/rate-limit";
import { verifyAdminKey } from "@/lib/admin-auth";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  if (!verifyAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] PUT /api/admin/products/${(await params).id} — IP: ${ip}`);
    return unauthorized();
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .update({
      name: body.name,
      slug: body.slug,
      description: body.description ?? "",
      badge: body.badge || null,
      image_url: body.image_url || null,
      is_featured: body.is_featured ?? false,
      is_active: body.is_active ?? true,
      category_id: body.category_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  if (!verifyAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] DELETE /api/admin/products/${(await params).id} — IP: ${ip}`);
    return unauthorized();
  }

  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
