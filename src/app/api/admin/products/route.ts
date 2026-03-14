import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAdminKey(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const supabase = createAdminSupabaseClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
}

export async function POST(req: NextRequest) {
  if (!checkAdminKey(req)) return unauthorized();

  const body = await req.json();
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
