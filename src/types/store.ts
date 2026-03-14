export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  price_cop: number;
  stock: number;
  is_active: boolean;
};

export type ProductMedia = {
  id: string;
  product_id: string;
  url: string;
  media_type: "image" | "video";
  sort_order: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  variants: ProductVariant[];
  media?: ProductMedia[];
};

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  size: string;
  color: string;
  unitPrice: number;
  qty: number;
};
