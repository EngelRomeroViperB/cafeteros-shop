import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRate } from "@/lib/rate-limit";

function unauthorized(detail?: string) {
  return NextResponse.json({ error: "Unauthorized", detail }, { status: 401 });
}

function checkAdminKey(req: NextRequest): { ok: boolean; detail?: string } {
  const key = req.headers.get("x-admin-key");
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return { ok: false, detail: "ADMIN_SECRET_KEY not configured on server" };
  if (!key) return { ok: false, detail: "No key provided" };
  if (key !== secret) return { ok: false, detail: "Key mismatch" };
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const auth = checkAdminKey(req);
  if (!auth.ok) {
    console.warn(`[ADMIN AUTH FAIL] GET /api/admin/products — IP: ${ip} — ${auth.detail}`);
    return unauthorized(auth.detail);
  }

  try {
    const supabase = createAdminSupabaseClient();

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: `products query failed: ${error.message} (code: ${error.code})` }, { status: 500 });
    }

    const productIds = (products ?? []).map((p) => p.id);

    const [variantsRes, mediaRes, categoriesRes] = await Promise.all([
      productIds.length > 0
        ? supabase
            .from("product_variants")
            .select("*")
            .in("product_id", productIds)
            .order("price_cop", { ascending: true })
        : { data: [], error: null },
      productIds.length > 0
        ? supabase
            .from("product_media")
            .select("*")
            .in("product_id", productIds)
            .order("sort_order", { ascending: true })
        : { data: [], error: null },
      supabase.from("categories").select("*").order("name"),
    ]);

    const variantsByProduct = new Map<string, typeof variantsRes.data>();
    (variantsRes.data ?? []).forEach((v: { product_id: string }) => {
      const arr = variantsByProduct.get(v.product_id) ?? [];
      arr.push(v);
      variantsByProduct.set(v.product_id, arr);
    });

    const mediaByProduct = new Map<string, typeof mediaRes.data>();
    (mediaRes.data ?? []).forEach((m: { product_id: string }) => {
      const arr = mediaByProduct.get(m.product_id) ?? [];
      arr.push(m);
      mediaByProduct.set(m.product_id, arr);
    });

    const enriched = (products ?? []).map((p) => ({
      ...p,
      variants: variantsByProduct.get(p.id) ?? [],
      media: mediaByProduct.get(p.id) ?? [],
    }));

    return NextResponse.json({
      products: enriched,
      categories: categoriesRes.data ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRate(`admin:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  const auth = checkAdminKey(req);
  if (!auth.ok) {
    console.warn(`[ADMIN AUTH FAIL] POST /api/admin/products — IP: ${ip} — ${auth.detail}`);
    return unauthorized(auth.detail);
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
  }
  if (!body.slug || typeof body.slug !== "string" || /\s/.test(body.slug)) {
    return NextResponse.json({ error: "Slug es requerido y no debe contener espacios" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      slug: body.slug,
      description: body.description ?? "",
      badge: body.badge || null,
      image_url: body.image_url || null,
      is_featured: body.is_featured ?? false,
      is_active: body.is_active ?? true,
      category_id: body.category_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
