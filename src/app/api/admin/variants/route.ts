import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUUID } from "@/lib/admin-auth";
import { guardAdmin, badRequest } from "@/lib/admin-api";

function validateVariantBody(body: Record<string, unknown>) {
  if (!body.size || typeof body.size !== "string" || !body.size.trim()) return "Talla es requerida";
  if (!body.gender || !["Dama", "Caballero"].includes(body.gender as string)) return "Género debe ser Dama o Caballero";
  if (typeof body.price_cop !== "number" || body.price_cop <= 0) return "Precio debe ser mayor a 0";
  if (body.stock !== undefined && (typeof body.stock !== "number" || body.stock < 0)) return "Stock debe ser >= 0";
  return null;
}

export async function POST(req: NextRequest) {
  const denied = guardAdmin(req, "POST /api/admin/variants");
  if (denied) return denied;

  const body = await req.json();
  const err = validateVariantBody(body);
  if (err) return badRequest(err);
  if (!body.product_id || !isUUID(body.product_id)) return badRequest("product_id es requerido y debe ser UUID válido");

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: body.product_id,
      size: body.size,
      gender: body.gender,
      price_cop: body.price_cop,
      stock: body.stock ?? 0,
      sort_order: body.sort_order ?? 0,
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
  const denied = guardAdmin(req, "PUT /api/admin/variants");
  if (denied) return denied;

  const body = await req.json();
  const err = validateVariantBody(body);
  if (err) return badRequest(err);
  if (!body.id || !isUUID(body.id)) return badRequest("id es requerido y debe ser UUID válido");

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .update({
      size: body.size,
      gender: body.gender,
      price_cop: body.price_cop,
      stock: body.stock ?? 0,
      sort_order: body.sort_order ?? 0,
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
  const denied = guardAdmin(req, "DELETE /api/admin/variants");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !isUUID(id)) {
    return NextResponse.json({ error: "id es requerido y debe ser UUID válido" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("product_variants").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
