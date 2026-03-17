import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRate } from "@/lib/rate-limit";

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function tooMany() {
  return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
}

function validateVariantBody(body: Record<string, unknown>) {
  if (!body.size || typeof body.size !== "string" || !body.size.trim()) return "Talla es requerida";
  if (!body.gender || !["Dama", "Caballero"].includes(body.gender as string)) return "Género debe ser Dama o Caballero";
  if (typeof body.price_cop !== "number" || body.price_cop <= 0) return "Precio debe ser mayor a 0";
  if (body.stock !== undefined && (typeof body.stock !== "number" || body.stock < 0)) return "Stock debe ser >= 0";
  return null;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdminKey(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) return tooMany();
  if (!checkAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] POST /api/admin/variants — IP: ${ip}`);
    return unauthorized();
  }

  const body = await req.json();
  const err = validateVariantBody(body);
  if (err) return badRequest(err);
  if (!body.product_id) return badRequest("product_id es requerido");

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: body.product_id,
      size: body.size,
      gender: body.gender,
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
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) return tooMany();
  if (!checkAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] PUT /api/admin/variants — IP: ${ip}`);
    return unauthorized();
  }

  const body = await req.json();
  const err = validateVariantBody(body);
  if (err) return badRequest(err);
  if (!body.id) return badRequest("id es requerido");

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .update({
      size: body.size,
      gender: body.gender,
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
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) return tooMany();
  if (!checkAdminKey(req)) {
    console.warn(`[ADMIN AUTH FAIL] DELETE /api/admin/variants — IP: ${ip}`);
    return unauthorized();
  }

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
