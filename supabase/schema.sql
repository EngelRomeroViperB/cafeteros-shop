create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  badge text,
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  gender text not null check (gender in ('Dama', 'Caballero')),
  price_cop integer not null check (price_cop > 0),
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  cost_cop integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists product_variants_product_size_gender_uniq
on public.product_variants (product_id, size, gender);

create index if not exists idx_products_is_active on public.products (is_active);
create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_product_media_product_id on public.product_media (product_id);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  gender text check (gender is null or gender in ('Dama', 'Caballero')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  reference text not null unique,
  status text not null default 'pending',
  wompi_status text,
  wompi_transaction_id text,
  total_cop integer not null default 0 check (total_cop >= 0),
  shipping_name text not null default '',
  shipping_phone text not null default '',
  shipping_address text not null default '',
  shipping_city text not null default '',
  shipping_department text not null default '',
  shipping_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  title text not null,
  selected_size text,
  selected_gender text,
  quantity integer not null check (quantity > 0),
  unit_price_cop integer not null check (unit_price_cop > 0),
  line_total_cop integer not null check (line_total_cop > 0),
  created_at timestamptz not null default now()
);

create or replace function public.decrement_stock(p_variant_id uuid, p_qty integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.product_variants
  set stock = greatest(stock - p_qty, 0)
  where id = p_variant_id;
end;
$$;

-- Only service_role (webhook) may call decrement_stock
revoke execute on function public.decrement_stock(uuid, integer) from public;
revoke execute on function public.decrement_stock(uuid, integer) from anon;
revoke execute on function public.decrement_stock(uuid, integer) from authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "service role manage profiles" on public.profiles;
create policy "service role manage profiles"
on public.profiles for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories"
on public.categories for select
using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products"
on public.products for select
using (is_active = true);

drop policy if exists "public read active variants" on public.product_variants;
create policy "public read active variants"
on public.product_variants for select
using (is_active = true);

drop policy if exists "public read product media" on public.product_media;
create policy "public read product media"
on public.product_media for select
using (true);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
on public.orders for select
using (auth.uid() = user_id);

drop policy if exists "service role insert orders" on public.orders;
create policy "service role insert orders"
on public.orders for insert
with check (auth.role() = 'service_role');

drop policy if exists "service role update orders" on public.orders;
create policy "service role update orders"
on public.orders for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items"
on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  )
);

drop policy if exists "service role insert order items" on public.order_items;
create policy "service role insert order items"
on public.order_items for insert
with check (auth.role() = 'service_role');

insert into public.categories (name, slug)
values
  ('Camisetas', 'camisetas'),
  ('Conjuntos', 'conjuntos')
on conflict (slug) do nothing;

with cat as (
  select id from public.categories where slug = 'camisetas' limit 1
),
prod1 as (
  insert into public.products (category_id, name, slug, description, badge, is_featured)
  select id, 'Camiseta Local Authentic 2026', 'camiseta-local-authentic-2026', 'Versión exacta usada por los jugadores.', 'Nuevo', true
  from cat
  on conflict (slug) do update
  set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    badge = excluded.badge,
    is_featured = excluded.is_featured
  returning id
),
prod2 as (
  insert into public.products (category_id, name, slug, description, badge, is_featured)
  select id, 'Camiseta Local Hinchas', 'camiseta-local-hinchas-2026', 'Corte clásico, ideal para la tribuna.', 'Más Vendida', true
  from cat
  on conflict (slug) do update
  set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    badge = excluded.badge,
    is_featured = excluded.is_featured
  returning id
),
prod3 as (
  insert into public.products (category_id, name, slug, description, is_featured)
  select id, 'Camiseta Visitante 2026', 'camiseta-visitante-2026', 'La elegancia oscura para los partidos de visita.', true
  from cat
  on conflict (slug) do update
  set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    is_featured = excluded.is_featured
  returning id
)
insert into public.product_variants (product_id, size, gender, price_cop, stock)
select id, 'M', 'Caballero', 449900, 20 from prod1
union all
select id, 'M', 'Caballero', 299900, 30 from prod2
union all
select id, 'M', 'Caballero', 299900, 25 from prod3
on conflict (product_id, size, gender) do update
set
  price_cop = excluded.price_cop,
  stock = excluded.stock,
  is_active = true;
