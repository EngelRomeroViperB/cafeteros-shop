import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product, ProductVariant } from "@/types/store";

const fallbackProducts: Product[] = [
  {
    id: "local-authentic",
    slug: "camiseta-local-authentic-2026",
    name: "Camiseta Local Authentic 2026",
    description: "Versión exacta usada por los jugadores.",
    badge: "Nuevo",
    image_url: null,
    is_featured: true,
    is_active: true,
    variants: [
      {
        id: "local-authentic-m",
        product_id: "local-authentic",
        size: "M",
        color: "Amarillo",
        price_cop: 449900,
        stock: 20,
        is_active: true,
      },
    ],
  },
];

export async function getFeaturedProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fallbackProducts;
  }

  const supabase = createServerSupabaseClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name, description, badge, image_url, is_featured, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  if (!products || products.length === 0) {
    return fallbackProducts;
  }

  const productIds = products.map((product) => product.id);

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, product_id, size, color, price_cop, stock, is_active")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("price_cop", { ascending: true });

  if (variantsError) {
    throw new Error(`Failed to fetch variants: ${variantsError.message}`);
  }

  const variantsByProduct = new Map<string, ProductVariant[]>();

  (variants ?? []).forEach((variant) => {
    const current = variantsByProduct.get(variant.product_id) ?? [];
    current.push(variant as ProductVariant);
    variantsByProduct.set(variant.product_id, current);
  });

  return products.map((product) => ({
    ...(product as Omit<Product, "variants">),
    variants: variantsByProduct.get(product.id) ?? [],
  }));
}
