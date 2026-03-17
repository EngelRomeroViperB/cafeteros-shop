export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  gender: "Dama" | "Caballero";
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
  is_primary: boolean;
  gender: "Dama" | "Caballero" | null;
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
  category_id: string | null;
  variants: ProductVariant[];
  media?: ProductMedia[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  badge: string;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  category_id: string;
};

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  size: string;
  gender: "Dama" | "Caballero";
  unitPrice: number;
  qty: number;
  imageUrl: string | null;
};
