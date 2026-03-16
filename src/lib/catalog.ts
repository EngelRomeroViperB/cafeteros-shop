import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Category, Product, ProductMedia, ProductVariant } from "@/types/store";

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
    category_id: null,
    variants: [
      {
        id: "local-authentic-m",
        product_id: "local-authentic",
        size: "M",
        gender: "Caballero" as const,
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

  try {
    const supabase = createServerSupabaseClient();

    const { data: products, error } = await supabase
      .from("products")
      .select("id, slug, name, description, badge, image_url, is_featured, is_active, category_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`Failed to fetch products: ${error.message}`);
      return fallbackProducts;
    }

    if (!products || products.length === 0) {
      return fallbackProducts;
    }

    const productIds = products.map((product) => product.id);

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, product_id, size, gender, price_cop, stock, is_active")
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("price_cop", { ascending: true });

    if (variantsError) {
      console.error(`Failed to fetch variants: ${variantsError.message}`);
      return fallbackProducts;
    }

    const variantsByProduct = new Map<string, ProductVariant[]>();

    (variants ?? []).forEach((variant) => {
      const current = variantsByProduct.get(variant.product_id) ?? [];
      current.push(variant as ProductVariant);
      variantsByProduct.set(variant.product_id, current);
    });

    const { data: media } = await supabase
      .from("product_media")
      .select("id, product_id, url, media_type, sort_order, is_primary")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    const mediaByProduct = new Map<string, ProductMedia[]>();
    (media ?? []).forEach((m) => {
      const current = mediaByProduct.get(m.product_id) ?? [];
      current.push(m as ProductMedia);
      mediaByProduct.set(m.product_id, current);
    });

    return products.map((product) => {
      const productMedia = mediaByProduct.get(product.id) ?? [];
      const primaryImage = productMedia.find((m) => m.media_type === "image" && m.is_primary);
      const firstImage = primaryImage ?? productMedia.find((m) => m.media_type === "image");
      return {
        ...(product as Omit<Product, "variants" | "media">),
        image_url: firstImage?.url || product.image_url || null,
        variants: variantsByProduct.get(product.id) ?? [],
        media: productMedia,
      };
    });
  } catch (err) {
    console.error("Supabase connection failed, using fallback products:", err);
    return fallbackProducts;
  }
}

export async function getCategories(): Promise<Category[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("categories").select("id, name, slug").order("name");
    return (data ?? []) as Category[];
  } catch {
    return [];
  }
}
