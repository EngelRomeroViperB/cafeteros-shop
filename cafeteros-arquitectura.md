+-----------------------------------------------------------------------+
| **🇨🇴 CAFETEROS SHOP**                                                 |
|                                                                       |
| Arquitectura Técnica Completa                                         |
|                                                                       |
| Next.js · Supabase · Wompi · Vercel                                   |
+-----------------------------------------------------------------------+

**1. Stack Tecnológico**

Tu stack actual es correcto y no necesitas cambiarlo. Aquí el rol de
cada pieza:

  ------------------ ---------------------- -----------------------------
  **Tecnología**     **Rol**                **Por qué**

  Next.js 14+        Frontend + API Routes  App Router, SSR, RSC,
                                            mobile-first

  Supabase Postgres  Base de datos          Tablas, relaciones, RLS
                     relacional             

  Supabase Storage   Imágenes y media       Buckets públicos, CDN
                                            integrado

  Supabase Auth      Autenticación usuarios OAuth, email, sesiones

  Wompi              Pasarela de pago       Sandbox + producción Colombia

  Vercel             Deploy + Edge          CI/CD automático desde main

  Tailwind CSS       Estilos                Mobile-first por defecto
  ------------------ ---------------------- -----------------------------

**2. Esquema de Base de Datos**

Este es el esquema correcto para manejar productos con múltiples
imágenes, variantes por talla/género y stock por variante.

**2.1 Diagrama de Relaciones**

  ------------------ ---------------------------- -------------------------
  **Tabla**          **Propósito**                **Relación principal**

  categories         Categorías de producto       → products

  products           Producto base (ej: Camiseta  → product_images,
                     Local 2026)                  product_variants

  product_images     Imágenes del producto (N     ← products
                     imágenes/producto)           

  product_variants   Variante: género + talla +   ← products, →
                     stock + precio               variant_images

  variant_images     Imagen específica de una     ← product_variants
                     variante                     

  profiles           Datos del usuario            → orders
                     autenticado                  

  orders             Orden de compra              → order_items

  order_items        Línea de la orden            ← orders,
                     (variante + cantidad)        product_variants
  ------------------ ---------------------------- -------------------------

**2.2 SQL Completo**

+-----------------------------------------------------------------------+
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| \-- CATEGORIES                                                        |
|                                                                       |
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| CREATE TABLE categories (                                             |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| name text NOT NULL,                                                   |
|                                                                       |
| slug text NOT NULL UNIQUE,                                            |
|                                                                       |
| description text,                                                     |
|                                                                       |
| created_at timestamptz DEFAULT now()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| \-- PRODUCTS (producto base, sin talla ni stock)                      |
|                                                                       |
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| CREATE TABLE products (                                               |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| category_id uuid REFERENCES categories(id) ON DELETE SET NULL,        |
|                                                                       |
| name text NOT NULL,                                                   |
|                                                                       |
| slug text NOT NULL UNIQUE,                                            |
|                                                                       |
| description text,                                                     |
|                                                                       |
| base_price numeric(10,2) NOT NULL DEFAULT 0,                          |
|                                                                       |
| is_active boolean DEFAULT true,                                       |
|                                                                       |
| is_featured boolean DEFAULT false,                                    |
|                                                                       |
| created_at timestamptz DEFAULT now()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| \-- PRODUCT_IMAGES (galería de imágenes del producto)                 |
|                                                                       |
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| CREATE TABLE product_images (                                         |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,   |
|                                                                       |
| storage_key text NOT NULL,                                            |
|                                                                       |
| \-- Ejemplo: \"products/camiseta-local-2026/front.jpg\"               |
|                                                                       |
| alt_text text,                                                        |
|                                                                       |
| sort_order int DEFAULT 0,                                             |
|                                                                       |
| is_primary boolean DEFAULT false,                                     |
|                                                                       |
| created_at timestamptz DEFAULT now()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| \-- Solo puede haber UNA imagen primaria por producto                 |
|                                                                       |
| CREATE UNIQUE INDEX product_primary_image                             |
|                                                                       |
| ON product_images(product_id)                                         |
|                                                                       |
| WHERE is_primary = true;                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| \-- PRODUCT_VARIANTS (talla + género + stock + precio override)       |
|                                                                       |
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| CREATE TYPE gender_type AS ENUM (\'hombre\', \'mujer\', \'unisex\');  |
|                                                                       |
| CREATE TYPE size_type AS ENUM                                         |
| (\'XS\',\'S\',\'M\',\'L\',\'XL\',\'XXL\',\'XXXL\');                   |
|                                                                       |
| CREATE TABLE product_variants (                                       |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,   |
|                                                                       |
| gender gender_type NOT NULL,                                          |
|                                                                       |
| size size_type NOT NULL,                                              |
|                                                                       |
| stock int NOT NULL DEFAULT 0 CHECK (stock \>= 0),                     |
|                                                                       |
| price_override numeric(10,2),                                         |
|                                                                       |
| \-- NULL = usa el base_price del producto                             |
|                                                                       |
| sku text UNIQUE,                                                      |
|                                                                       |
| is_active boolean DEFAULT true,                                       |
|                                                                       |
| created_at timestamptz DEFAULT now(),                                 |
|                                                                       |
| UNIQUE(product_id, gender, size)                                      |
|                                                                       |
| \-- No puede haber dos variantes iguales                              |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| \-- VARIANT_IMAGES (imagen específica de la variante)                 |
|                                                                       |
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| CREATE TABLE variant_images (                                         |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE    |
| CASCADE,                                                              |
|                                                                       |
| storage_key text NOT NULL,                                            |
|                                                                       |
| alt_text text,                                                        |
|                                                                       |
| sort_order int DEFAULT 0,                                             |
|                                                                       |
| is_primary boolean DEFAULT false,                                     |
|                                                                       |
| created_at timestamptz DEFAULT now()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| \-- ORDERS y ORDER_ITEMS                                              |
|                                                                       |
| \-- ─────────────────────────────────────────────────────────────     |
|                                                                       |
| CREATE TYPE order_status AS ENUM (                                    |
|                                                                       |
| \'pending\',\'proce                                                   |
| ssing\',\'paid\',\'shipped\',\'delivered\',\'cancelled\',\'refunded\' |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE TABLE orders (                                                 |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,            |
|                                                                       |
| status order_status DEFAULT \'pending\',                              |
|                                                                       |
| total_amount numeric(10,2) NOT NULL,                                  |
|                                                                       |
| wompi_tx_id text,                                                     |
|                                                                       |
| wompi_reference text UNIQUE,                                          |
|                                                                       |
| shipping_data jsonb,                                                  |
|                                                                       |
| created_at timestamptz DEFAULT now()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE TABLE order_items (                                            |
|                                                                       |
| id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,       |
|                                                                       |
| variant_id uuid NOT NULL REFERENCES product_variants(id),             |
|                                                                       |
| quantity int NOT NULL CHECK (quantity \> 0),                          |
|                                                                       |
| unit_price numeric(10,2) NOT NULL                                     |
|                                                                       |
| \-- Precio al momento de la compra (no cambia si el producto cambia)  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

**3. Supabase Storage --- Estructura de Buckets**

Organizar bien el Storage es clave para que las URLs sean predecibles y
fáciles de construir.

**3.1 Bucket: product-media (público)**

+-----------------------------------------------------------------------+
| **Estructura de carpetas en el bucket**                               |
|                                                                       |
| product-media/                                                        |
|                                                                       |
| └── products/                                                         |
|                                                                       |
| └── {product-slug}/                                                   |
|                                                                       |
| ├── main.jpg ← imagen principal del producto                          |
|                                                                       |
| ├── gallery-01.jpg ← galería general                                  |
|                                                                       |
| ├── gallery-02.jpg                                                    |
|                                                                       |
| └── variants/                                                         |
|                                                                       |
| ├── hombre-S.jpg                                                      |
|                                                                       |
| ├── hombre-M.jpg                                                      |
|                                                                       |
| └── mujer-S.jpg                                                       |
+-----------------------------------------------------------------------+

El campo storage_key en la base de datos guarda solo la ruta relativa
dentro del bucket, nunca la URL completa. Así puedes cambiar de bucket o
dominio sin tocar la BD.

+-----------------------------------------------------------------------+
| \-- Ejemplo de storage_key guardado en product_images:                |
|                                                                       |
| \'products/camiseta-local-2026/main.jpg\'                             |
|                                                                       |
| \-- Para construir la URL pública en el frontend:                     |
|                                                                       |
| const url = supabase.storage                                          |
|                                                                       |
| .from(\'product-media\')                                              |
|                                                                       |
| .getPublicUrl(storage_key).data.publicUrl                             |
+-----------------------------------------------------------------------+

**3.2 Políticas de Storage (RLS)**

  ------------------ ---------------------- -----------------------------
  **Operación**      **Quién puede**        **Política**

  SELECT (leer)      Todos (público)        bucket es público → acceso
                                            libre

  INSERT (subir)     Solo admin/service     Usar
                     role                   SUPABASE_SERVICE_ROLE_KEY

  UPDATE / DELETE    Solo admin/service     Usar
                     role                   SUPABASE_SERVICE_ROLE_KEY
  ------------------ ---------------------- -----------------------------

**4. Estructura de Carpetas --- Next.js App Router**

Esta es la estructura recomendada para tu proyecto, organizada para ser
escalable y mobile-first.

+-----------------------------------------------------------------------+
| **Árbol de carpetas src/**                                            |
|                                                                       |
| src/                                                                  |
|                                                                       |
| ├── app/                                                              |
|                                                                       |
| │ ├── layout.tsx ← Layout raíz (metadata, fuentes)                    |
|                                                                       |
| │ ├── page.tsx ← Home / Hero                                          |
|                                                                       |
| │ ├── globals.css ← Estilos globales + variables                      |
|                                                                       |
| │ ├── coleccion/                                                      |
|                                                                       |
| │ │ └── page.tsx ← Catálogo general                                   |
|                                                                       |
| │ ├── producto/                                                       |
|                                                                       |
| │ │ └── \[slug\]/                                                     |
|                                                                       |
| │ │ └── page.tsx ← Detalle de producto (SSR)                          |
|                                                                       |
| │ ├── carrito/                                                        |
|                                                                       |
| │ │ └── page.tsx ← Vista del carrito                                  |
|                                                                       |
| │ ├── checkout/                                                       |
|                                                                       |
| │ │ └── page.tsx ← Resumen + datos envío                              |
|                                                                       |
| │ ├── cuenta/                                                         |
|                                                                       |
| │ │ ├── page.tsx ← Perfil usuario                                     |
|                                                                       |
| │ │ └── pedidos/                                                      |
|                                                                       |
| │ │ └── page.tsx ← Historial de órdenes                               |
|                                                                       |
| │ └── api/                                                            |
|                                                                       |
| │ ├── checkout/                                                       |
|                                                                       |
| │ │ └── wompi/route.ts ← Crear orden + URL Wompi                      |
|                                                                       |
| │ └── wompi/                                                          |
|                                                                       |
| │ └── webhook/route.ts ← Recibir eventos Wompi                        |
|                                                                       |
| ├── components/                                                       |
|                                                                       |
| │ ├── ui/ ← Botones, inputs, badges, modals                           |
|                                                                       |
| │ ├── product/                                                        |
|                                                                       |
| │ │ ├── ProductCard.tsx ← Tarjeta en catálogo                         |
|                                                                       |
| │ │ ├── ProductGallery.tsx ← Galería de imágenes + zoom               |
|                                                                       |
| │ │ ├── VariantSelector.tsx ← Selector género + talla                 |
|                                                                       |
| │ │ └── SizeGuide.tsx ← Modal guía de tallas                          |
|                                                                       |
| │ ├── cart/                                                           |
|                                                                       |
| │ │ ├── CartDrawer.tsx ← Carrito lateral (mobile-friendly)            |
|                                                                       |
| │ │ └── CartItem.tsx                                                  |
|                                                                       |
| │ └── layout/                                                         |
|                                                                       |
| │ ├── Navbar.tsx                                                      |
|                                                                       |
| │ └── Footer.tsx                                                      |
|                                                                       |
| ├── lib/                                                              |
|                                                                       |
| │ ├── supabase/                                                       |
|                                                                       |
| │ │ ├── client.ts ← createBrowserClient()                             |
|                                                                       |
| │ │ ├── server.ts ← createServerClient()                              |
|                                                                       |
| │ │ └── queries.ts ← Queries reutilizables                            |
|                                                                       |
| │ ├── store/                                                          |
|                                                                       |
| │ │ └── cart.ts ← Zustand: estado del carrito                         |
|                                                                       |
| │ └── utils/                                                          |
|                                                                       |
| │ ├── price.ts ← formatPrice(), getVariantPrice()                     |
|                                                                       |
| │ └── storage.ts ← getImageUrl(storage_key)                           |
|                                                                       |
| └── types/                                                            |
|                                                                       |
| └── index.ts ← Tipos TypeScript de toda la app                        |
+-----------------------------------------------------------------------+

**5. Tipos TypeScript Centrales**

Define todos los tipos en src/types/index.ts. Estos reflejan exactamente
las tablas de Supabase.

+-----------------------------------------------------------------------+
| // src/types/index.ts                                                 |
|                                                                       |
| export type Gender = \"hombre\" \| \"mujer\" \| \"unisex\";           |
|                                                                       |
| export type Size = \"XS\" \| \"S\" \| \"M\" \| \"L\" \| \"XL\" \|     |
| \"XXL\" \| \"XXXL\";                                                  |
|                                                                       |
| export interface ProductImage {                                       |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| product_id: string;                                                   |
|                                                                       |
| storage_key: string;                                                  |
|                                                                       |
| alt_text: string \| null;                                             |
|                                                                       |
| sort_order: number;                                                   |
|                                                                       |
| is_primary: boolean;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface VariantImage {                                       |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| variant_id: string;                                                   |
|                                                                       |
| storage_key: string;                                                  |
|                                                                       |
| alt_text: string \| null;                                             |
|                                                                       |
| sort_order: number;                                                   |
|                                                                       |
| is_primary: boolean;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface ProductVariant {                                     |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| product_id: string;                                                   |
|                                                                       |
| gender: Gender;                                                       |
|                                                                       |
| size: Size;                                                           |
|                                                                       |
| stock: number;                                                        |
|                                                                       |
| price_override: number \| null;                                       |
|                                                                       |
| sku: string \| null;                                                  |
|                                                                       |
| is_active: boolean;                                                   |
|                                                                       |
| variant_images: VariantImage\[\];                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface Product {                                            |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| name: string;                                                         |
|                                                                       |
| slug: string;                                                         |
|                                                                       |
| description: string \| null;                                          |
|                                                                       |
| base_price: number;                                                   |
|                                                                       |
| is_active: boolean;                                                   |
|                                                                       |
| is_featured: boolean;                                                 |
|                                                                       |
| category: Category \| null;                                           |
|                                                                       |
| product_images: ProductImage\[\]; // galería general                  |
|                                                                       |
| product_variants: ProductVariant\[\];                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface CartItem {                                           |
|                                                                       |
| variant_id: string;                                                   |
|                                                                       |
| product_id: string;                                                   |
|                                                                       |
| product_name: string;                                                 |
|                                                                       |
| gender: Gender;                                                       |
|                                                                       |
| size: Size;                                                           |
|                                                                       |
| quantity: number;                                                     |
|                                                                       |
| unit_price: number;                                                   |
|                                                                       |
| image_url: string;                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**6. Queries Supabase --- src/lib/supabase/queries.ts**

Estas son las queries clave que el frontend necesita. Usar joins (select
anidado) para traer todo en una sola llamada.

**Query: catálogo (lista de productos)**

+-----------------------------------------------------------------------+
| export async function getProducts(categorySlug?: string) {            |
|                                                                       |
| let query = supabase                                                  |
|                                                                       |
| .from(\"products\")                                                   |
|                                                                       |
| .select(\`                                                            |
|                                                                       |
| id, name, slug, base_price, is_featured,                              |
|                                                                       |
| category:categories(name, slug),                                      |
|                                                                       |
| product_images(                                                       |
|                                                                       |
| storage_key, alt_text, is_primary                                     |
|                                                                       |
| ),                                                                    |
|                                                                       |
| product_variants(                                                     |
|                                                                       |
| id, gender, size, stock, price_override, is_active                    |
|                                                                       |
| )                                                                     |
|                                                                       |
| \`)                                                                   |
|                                                                       |
| .eq(\"is_active\", true)                                              |
|                                                                       |
| .order(\"is_featured\", { ascending: false });                        |
|                                                                       |
| if (categorySlug) {                                                   |
|                                                                       |
| query = query.eq(\"category.slug\", categorySlug);                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| const { data, error } = await query;                                  |
|                                                                       |
| return data as Product\[\];                                           |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Query: detalle de producto (página individual)**

+-----------------------------------------------------------------------+
| export async function getProductBySlug(slug: string) {                |
|                                                                       |
| const { data } = await supabase                                       |
|                                                                       |
| .from(\"products\")                                                   |
|                                                                       |
| .select(\`                                                            |
|                                                                       |
| \*,                                                                   |
|                                                                       |
| category:categories(name, slug),                                      |
|                                                                       |
| product_images(                                                       |
|                                                                       |
| id, storage_key, alt_text, sort_order, is_primary                     |
|                                                                       |
| ),                                                                    |
|                                                                       |
| product_variants(                                                     |
|                                                                       |
| id, gender, size, stock, price_override, is_active,                   |
|                                                                       |
| variant_images(                                                       |
|                                                                       |
| id, storage_key, alt_text, sort_order, is_primary                     |
|                                                                       |
| )                                                                     |
|                                                                       |
| )                                                                     |
|                                                                       |
| \`)                                                                   |
|                                                                       |
| .eq(\"slug\", slug)                                                   |
|                                                                       |
| .eq(\"is_active\", true)                                              |
|                                                                       |
| .single();                                                            |
|                                                                       |
| return data as Product;                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Utilidad: construir URL de imagen**

+-----------------------------------------------------------------------+
| // src/lib/utils/storage.ts                                           |
|                                                                       |
| const BUCKET = \"product-media\";                                     |
|                                                                       |
| export function getImageUrl(storageKey: string): string {             |
|                                                                       |
| const { data } = supabase.storage                                     |
|                                                                       |
| .from(BUCKET)                                                         |
|                                                                       |
| .getPublicUrl(storageKey);                                            |
|                                                                       |
| return data.publicUrl;                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Obtener imagen principal de un producto                            |
|                                                                       |
| export function getPrimaryImage(images: ProductImage\[\]): string {   |
|                                                                       |
| const primary = images.find(img =\> img.is_primary) ?? images\[0\];   |
|                                                                       |
| return primary ? getImageUrl(primary.storage_key) :                   |
| \"/placeholder.jpg\";                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Obtener imagen de una variante específica                          |
|                                                                       |
| export function getVariantImage(variant: ProductVariant): string {    |
|                                                                       |
| const primary = variant.variant_images?.find(i =\> i.is_primary)      |
|                                                                       |
| ?? variant.variant_images?.\[0\];                                     |
|                                                                       |
| return primary ? getImageUrl(primary.storage_key) :                   |
| \"/placeholder.jpg\";                                                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**7. Lógica de Imágenes --- Cómo Funciona**

Este es el flujo correcto para mostrar imágenes según el contexto
(catálogo vs detalle vs variante seleccionada).

  ------------------ ---------------------- -----------------------------
  **Contexto**       **Qué mostrar**        **Fuente de datos**

  Tarjeta en         1 imagen principal     product_images WHERE
  catálogo                                  is_primary=true

  Página de producto Galería completa       product_images ordenadas por
                                            sort_order

  Usuario selecciona Imagen de esa variante variant_images de esa
  género/talla                              product_variant

  Carrito            1 imagen de la         variant_images\[0\] de la
                     variante comprada      variante

  Orden / historial  1 imagen de la         Se guarda en el momento de
                     variante               compra
  ------------------ ---------------------- -----------------------------

**7.1 Flujo en la página de producto**

+-----------------------------------------------------------------------+
| **Flujo de selección de imagen**                                      |
|                                                                       |
| 1\. Al cargar: mostrar galería de product_images (imágenes generales  |
| del producto)                                                         |
|                                                                       |
| 2\. Usuario elige género (ej: \"Mujer\"): filtrar variantes           |
| disponibles por género                                                |
|                                                                       |
| 3\. Usuario elige talla (ej: \"M\"): seleccionar la variante exacta   |
| (género+talla)                                                        |
|                                                                       |
| 4\. Si esa variante tiene variant_images → cambiar galería a esas     |
| imágenes                                                              |
|                                                                       |
| 5\. Si no tiene → mantener las product_images generales               |
|                                                                       |
| 6\. Mostrar precio: price_override ?? base_price                      |
|                                                                       |
| 7\. Mostrar stock: variant.stock (0 = botón deshabilitado)            |
+-----------------------------------------------------------------------+

**7.2 Componente VariantSelector --- Lógica**

+-----------------------------------------------------------------------+
| // src/components/product/VariantSelector.tsx                         |
|                                                                       |
| // Estado local                                                       |
|                                                                       |
| const \[selectedGender, setSelectedGender\] = useState\<Gender \|     |
| null\>(null);                                                         |
|                                                                       |
| const \[selectedSize, setSelectedSize\] = useState\<Size \|           |
| null\>(null);                                                         |
|                                                                       |
| // Variante actualmente seleccionada                                  |
|                                                                       |
| const selectedVariant = product.product_variants.find(v =\>           |
|                                                                       |
| v.gender === selectedGender &&                                        |
|                                                                       |
| v.size === selectedSize &&                                            |
|                                                                       |
| v.is_active                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Tallas disponibles para el género elegido                          |
|                                                                       |
| const availableSizes = product.product_variants                       |
|                                                                       |
| .filter(v =\> v.gender === selectedGender && v.is_active)             |
|                                                                       |
| .map(v =\> ({ size: v.size, inStock: v.stock \> 0 }));                |
|                                                                       |
| // Precio mostrado                                                    |
|                                                                       |
| const displayPrice = selectedVariant?.price_override ??               |
| product.base_price;                                                   |
|                                                                       |
| // ¿Se puede agregar al carrito?                                      |
|                                                                       |
| const canAddToCart = selectedVariant && selectedVariant.stock \> 0;   |
+-----------------------------------------------------------------------+

**8. Carrito --- Estado Global con Zustand**

El carrito vive en el cliente (localStorage para persistencia) usando
Zustand. Cada ítem referencia una variante específica.

+-----------------------------------------------------------------------+
| // src/lib/store/cart.ts                                              |
|                                                                       |
| import { create } from \'zustand\';                                   |
|                                                                       |
| import { persist } from \'zustand/middleware\';                       |
|                                                                       |
| interface CartStore {                                                 |
|                                                                       |
| items: CartItem\[\];                                                  |
|                                                                       |
| addItem: (item: CartItem) =\> void;                                   |
|                                                                       |
| removeItem: (variantId: string) =\> void;                             |
|                                                                       |
| updateQty: (variantId: string, qty: number) =\> void;                 |
|                                                                       |
| clearCart: () =\> void;                                               |
|                                                                       |
| total: () =\> number;                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| export const useCart = create\<CartStore\>()(persist(                 |
|                                                                       |
| (set, get) =\> ({                                                     |
|                                                                       |
| items: \[\],                                                          |
|                                                                       |
| addItem: (newItem) =\> set(state =\> {                                |
|                                                                       |
| const exists = state.items.find(i =\> i.variant_id ===                |
| newItem.variant_id);                                                  |
|                                                                       |
| if (exists) {                                                         |
|                                                                       |
| return { items: state.items.map(i =\>                                 |
|                                                                       |
| i.variant_id === newItem.variant_id                                   |
|                                                                       |
| ? { \...i, quantity: i.quantity + newItem.quantity }                  |
|                                                                       |
| : i                                                                   |
|                                                                       |
| )};                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { items: \[\...state.items, newItem\] };                       |
|                                                                       |
| }),                                                                   |
|                                                                       |
| removeItem: (variantId) =\> set(state =\> ({                          |
|                                                                       |
| items: state.items.filter(i =\> i.variant_id !== variantId)           |
|                                                                       |
| })),                                                                  |
|                                                                       |
| updateQty: (variantId, qty) =\> set(state =\> ({                      |
|                                                                       |
| items: state.items.map(i =\>                                          |
|                                                                       |
| i.variant_id === variantId ? { \...i, quantity: qty } : i             |
|                                                                       |
| )                                                                     |
|                                                                       |
| })),                                                                  |
|                                                                       |
| clearCart: () =\> set({ items: \[\] }),                               |
|                                                                       |
| total: () =\> get().items.reduce(                                     |
|                                                                       |
| (sum, i) =\> sum + i.unit_price \* i.quantity, 0                      |
|                                                                       |
| ),                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| { name: \'cafeteros-cart\' }                                          |
|                                                                       |
| ));                                                                   |
+-----------------------------------------------------------------------+

**9. Flujo de Pago --- Wompi**

El flujo de pago tiene dos partes: crear la orden en Supabase y
redirigir a Wompi; luego recibir el webhook de confirmación.

  --------------- -------------------- ----------------------------------------
  **Paso**        **Quién**            **Qué pasa**

  1\. Usuario     Frontend             Llama POST /api/checkout/wompi con items
  hace checkout                        del carrito

  2\. Crear orden API Route            Inserta en orders + order_items,
                                       descuenta stock

  3\. Generar URL API Route            Construye URL de Wompi con referencia
                                       única e integridad

  4\. Redirigir   Frontend             window.location = wompiUrl

  5\. Usuario     Wompi                Procesa el pago externamente
  paga                                 

  6\. Webhook     Wompi →              Notifica resultado (paid/failed)
                  /api/wompi/webhook   

  7\. Actualizar  API Route            Cambia orders.status según evento
  orden                                

  8\. Email de    API Route            Opcional: Resend o SendGrid
  confirmación                         
  --------------- -------------------- ----------------------------------------

+-----------------------------------------------------------------------+
| **IMPORTANTE --- Seguridad del webhook**                              |
|                                                                       |
| Siempre verifica la firma del webhook con WOMPI_EVENTS_SECRET antes   |
| de actualizar la BD.                                                  |
|                                                                       |
| Nunca confíes en el resultado solo porque llegó al endpoint.          |
|                                                                       |
| Usa wompi_reference como identificador único (no el id interno de la  |
| orden).                                                               |
+-----------------------------------------------------------------------+

**10. Mobile-First --- Guía de Implementación**

Tailwind CSS es mobile-first por diseño. Los breakpoints se aplican
hacia arriba (sm: md: lg:).

**10.1 Breakpoints a usar**

  ------------------ ------------------ ---------------------------------
  **Prefijo          **Ancho mínimo**   **Dispositivo objetivo**
  Tailwind**                            

  (sin prefijo)      0px                Móvil (diseña aquí primero)

  sm:                640px              Tablet pequeño

  md:                768px              Tablet

  lg:                1024px             Desktop

  xl:                1280px             Desktop grande
  ------------------ ------------------ ---------------------------------

**10.2 Patrones de Layout clave**

+-----------------------------------------------------------------------+
| // Catálogo: 1 columna mobile → 2 tablet → 3 desktop                  |
|                                                                       |
| \<div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3      |
| gap-4\"\>                                                             |
|                                                                       |
| // Navbar: hamburger menu en mobile                                   |
|                                                                       |
| \<nav className=\"flex items-center justify-between px-4 py-3         |
| lg:px-8\"\>                                                           |
|                                                                       |
| \<MenuButton className=\"lg:hidden\" /\> {/\* solo mobile \*/}        |
|                                                                       |
| \<DesktopNav className=\"hidden lg:flex\" /\> {/\* solo desktop \*/}  |
|                                                                       |
| // Carrito: drawer en mobile → sidebar en desktop                     |
|                                                                       |
| \<aside className=\"fixed inset-y-0 right-0 w-full sm:w-96            |
| lg:relative lg:w-auto\"\>                                             |
|                                                                       |
| // Galería: scroll horizontal en mobile → grid en desktop             |
|                                                                       |
| \<div className=\"flex overflow-x-auto snap-x lg:grid                 |
| lg:grid-cols-2\"\>                                                    |
|                                                                       |
| // Botón CTA: ancho completo en mobile                                |
|                                                                       |
| \<button className=\"w-full sm:w-auto px-8 py-3\"\>                   |
+-----------------------------------------------------------------------+

**10.3 Componente ProductGallery --- Lógica mobile-first**

+-----------------------------------------------------------------------+
| **Comportamiento por dispositivo**                                    |
|                                                                       |
| Mobile: scroll horizontal snapping entre imágenes + dots indicadores  |
| abajo                                                                 |
|                                                                       |
| Tablet: imagen principal grande + thumbnails debajo en fila           |
|                                                                       |
| Desktop: imagen principal a la izquierda + thumbnails en columna      |
| lateral                                                               |
|                                                                       |
| Zoom: en mobile = modal fullscreen \| en desktop = hover zoom inline  |
+-----------------------------------------------------------------------+

**11. Variables de Entorno**

  ------------------------------- ------------------------ ----------------------
  **Variable**                    **Uso**                  **Dónde**

  NEXT_PUBLIC_SUPABASE_URL        URL del proyecto         Cliente + servidor
                                  Supabase                 

  NEXT_PUBLIC_SUPABASE_ANON_KEY   Key pública Supabase     Cliente + servidor

  SUPABASE_SERVICE_ROLE_KEY       Admin Supabase (nunca    Solo servidor
                                  exponer)                 

  NEXT_PUBLIC_APP_URL             URL base de la app       Webhooks, redirects

  WOMPI_PUBLIC_KEY                Key pública Wompi        Cliente (checkout URL)

  WOMPI_PRIVATE_KEY               Key privada Wompi        Solo servidor

  WOMPI_INTEGRITY_SECRET          Firma de transacciones   Solo servidor

  WOMPI_EVENTS_SECRET             Verificar webhooks       Solo servidor

  WOMPI_CHECKOUT_URL              URL base checkout Wompi  Servidor
  ------------------------------- ------------------------ ----------------------

**12. Checklist de Implementación**

Sigue este orden para evitar bloqueos y tener siempre algo funcional en
cada paso.

  -------- ------------------------------------------------- -----------------
  **\#**   **Tarea**                                         **Prioridad**

  1        Aplicar el nuevo schema.sql en Supabase (DROP y   CRÍTICO
           recrear tablas)                                   

  2        Reorganizar archivos en Supabase Storage según    CRÍTICO
           estructura de carpetas                            

  3        Crear src/types/index.ts con todos los tipos      CRÍTICO

  4        Crear src/lib/utils/storage.ts (getImageUrl,      CRÍTICO
           getPrimaryImage, getVariantImage)                 

  5        Crear src/lib/supabase/queries.ts con getProducts CRÍTICO
           y getProductBySlug                                

  6        Actualizar ProductCard.tsx para usar              CRÍTICO
           getPrimaryImage()                                 

  7        Crear ProductGallery.tsx con soporte multi-imagen ALTO
           y mobile-first                                    

  8        Crear VariantSelector.tsx con lógica              ALTO
           género+talla+stock                                

  9        Crear useCart store con Zustand + persist         ALTO

  10       Crear CartDrawer.tsx mobile-friendly              ALTO

  11       Actualizar /api/checkout/wompi con nuevo esquema  ALTO
           de order_items                                    

  12       Probar flujo completo sandbox Wompi               MEDIO

  13       Agregar guía de tallas (SizeGuide.tsx)            MEDIO

  14       SEO: metadata dinámica por producto               MEDIO

  15       Deploy y verificar en móvil real                  ALTO
  -------- ------------------------------------------------- -----------------

+-----------------------------------------------------------------------+
| **CAFETEROS SHOP · Arquitectura Técnica v1.0**                        |
|                                                                       |
| Next.js + Supabase + Wompi + Vercel                                   |
+-----------------------------------------------------------------------+
