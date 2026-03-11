# La Tricolor Store

Tienda e-commerce para camisetas de la Selección Colombia, construida con `Next.js + Supabase + Wompi (sandbox)` y lista para desplegar en Vercel.

## Stack

- `Next.js` (App Router, TypeScript, Tailwind CSS)
- `Supabase` (Auth + Postgres + RLS)
- `Wompi` (checkout sandbox + webhook)
- `Vercel` (deploy continuo desde `main`)

## 1) Configuración local

1. Instala dependencias:
   - `npm install`
2. Crea archivo de variables:
   - `cp .env.example .env.local` (en Windows, copia manual con el explorador o `copy .env.example .env.local`)
3. Llena variables en `.env.local`:
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `WOMPI_BASE_URL=https://sandbox.wompi.co/v1`
   - `WOMPI_CHECKOUT_URL=https://checkout.wompi.co/p/`
   - `WOMPI_PUBLIC_KEY=...`
   - `WOMPI_PRIVATE_KEY=...` (reservada para evolución backend)
   - `WOMPI_INTEGRITY_SECRET=...`
   - `WOMPI_EVENTS_SECRET=...`

## 2) Base de datos Supabase

1. Abre SQL Editor en Supabase.
2. Ejecuta `supabase/schema.sql`.
3. Verifica tablas creadas:
   - `categories`, `products`, `product_variants`, `orders`, `order_items`, `profiles`
4. Verifica datos semilla:
   - 3 productos de camisetas con variantes iniciales.

## 3) Correr proyecto

- `npm run dev`
- Abre `http://localhost:3000`

## 4) Flujo funcional MVP

- Catálogo cargado desde Supabase (editable).
- Carrito multi-ítem en frontend.
- Login/registro con Supabase Auth.
- Checkout crea orden (`orders` + `order_items`) y redirige a Wompi sandbox.
- Webhook actualiza estado de orden en Supabase.

## 5) Endpoints

- `POST /api/checkout/wompi`
  - Crea orden y genera URL de checkout Wompi.
- `POST /api/wompi/webhook`
  - Recibe eventos `transaction.updated` y actualiza `orders.status`.

## 6) Subir a GitHub (repo nuevo)

1. Crea repo nuevo en GitHub: `cafeteros-shop`.
2. Comandos:
   - `git add .`
   - `git commit -m "feat: initial storefront with supabase and wompi sandbox"`
   - `git branch -M main`
   - `git remote add origin https://github.com/TU_USUARIO/cafeteros-shop.git`
   - `git push -u origin main`

## 7) Deploy en Vercel

1. Importa el repo en Vercel.
2. Configura todas las variables de entorno de `.env.example` en Vercel (Preview + Production).
3. Deploy automático desde `main`.
4. Configura webhook de Wompi:
   - `https://TU_DOMINIO/api/wompi/webhook`

## 8) Paso a producción Wompi

Revisa el checklist:

- `docs/wompi-production-checklist.md`
