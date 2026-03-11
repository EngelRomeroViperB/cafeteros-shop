import Storefront from "@/components/storefront";
import { getFeaturedProducts } from "@/lib/catalog";

export default async function Home() {
  const products = await getFeaturedProducts();

  return (
    <Storefront products={products} />
  );
}
