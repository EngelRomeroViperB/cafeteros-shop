import Storefront from "@/components/storefront";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";

export const revalidate = 60;

export default async function Home() {
  const [products, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <Storefront products={products} categories={categories} />
  );
}
