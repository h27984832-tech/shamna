-- SHAMNA marketplace foundation.
-- Review this file before applying it to any Supabase project.
-- It is source code only; creating this file does not change a database.

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'seller', 'admin');
create type public.store_status as enum ('pending', 'active', 'rejected', 'suspended');
create type public.order_status as enum (
  'new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  region_name text not null default 'ريف دمشق',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (length(description) <= 2000),
  status public.store_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_delivery_zones (
  store_id uuid not null references public.stores(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict,
  fee_syp bigint not null check (fee_syp >= 0),
  is_active boolean not null default false,
  primary key (store_id, city_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 160),
  description text not null default '' check (length(description) <= 5000),
  price_syp bigint not null check (price_syp > 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '' check (length(alt_text) <= 250),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict,
  recipient_name text not null check (length(trim(recipient_name)) between 2 and 100),
  phone text not null check (length(trim(phone)) between 7 and 30),
  address_line text not null check (length(trim(address_line)) between 3 and 500),
  delivery_notes text not null default '' check (length(delivery_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  address_snapshot jsonb not null,
  status public.order_status not null default 'new',
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  currency char(3) not null default 'SYP' check (currency = 'SYP'),
  subtotal_syp bigint not null default 0 check (subtotal_syp >= 0),
  delivery_fee_syp bigint not null default 0 check (delivery_fee_syp >= 0),
  total_syp bigint not null default 0 check (total_syp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  status public.order_status not null default 'new',
  subtotal_syp bigint not null check (subtotal_syp >= 0),
  delivery_fee_syp bigint not null check (delivery_fee_syp >= 0),
  total_syp bigint not null check (total_syp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, store_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_order_id uuid not null references public.store_orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_syp bigint not null check (unit_price_syp > 0),
  quantity integer not null check (quantity > 0),
  line_total_syp bigint not null check (line_total_syp > 0),
  created_at timestamptz not null default now(),
  check (line_total_syp = unit_price_syp * quantity)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  store_order_id uuid not null references public.store_orders(id) on delete restrict,
  changed_by uuid references auth.users(id) on delete set null,
  old_status public.order_status,
  new_status public.order_status not null,
  created_at timestamptz not null default now()
);

create index products_active_category_idx on public.products (category_id, created_at desc) where is_active;
create index products_store_idx on public.products (store_id, created_at desc);
create index stores_city_status_idx on public.stores (city_id, status);
create index store_orders_store_status_idx on public.store_orders (store_id, status, created_at desc);
create index store_orders_order_idx on public.store_orders (order_id);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index order_items_store_order_idx on public.order_items (store_order_id);
create index order_history_created_idx on public.order_status_history (store_order_id, created_at desc);
create index addresses_user_idx on public.addresses (user_id, created_at desc);

create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = p_role
  );
$$;

-- Breaks policy recursion while allowing a seller to read delivery details for
-- orders that contain their own store's items.
create or replace function public.owns_store_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_orders so
    join public.stores s on s.id = so.store_id
    where so.order_id = p_order_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger stores_touch_updated_at before update on public.stores
  for each row execute function public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products
  for each row execute function public.touch_updated_at();
create trigger addresses_touch_updated_at before update on public.addresses
  for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger store_orders_touch_updated_at before update on public.store_orders
  for each row execute function public.touch_updated_at();

create or replace function public.record_store_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (store_order_id, changed_by, old_status, new_status)
    values (new.id, auth.uid(), null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (store_order_id, changed_by, old_status, new_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger store_order_status_history
  after insert or update of status on public.store_orders
  for each row execute function public.record_store_order_status();

insert into public.cities (name, slug, region_name)
values ('قطنا', 'qatana', 'ريف دمشق'), ('جرمانا', 'jarmana', 'ريف دمشق')
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order)
values
  ('مونة', 'pantry', 10),
  ('منزل', 'home', 20),
  ('أزياء', 'fashion', 30),
  ('عناية', 'care', 40)
on conflict (slug) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.store_delivery_zones enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.store_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy "profiles read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.has_role('admin'));
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "roles read own or admin" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or public.has_role('admin'));

create policy "active cities are public" on public.cities
  for select to anon, authenticated using (is_active);
create policy "admin manages cities" on public.cities
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));
create policy "active categories are public" on public.categories
  for select to anon, authenticated using (is_active);
create policy "admin manages categories" on public.categories
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "stores public when active, owner or admin" on public.stores
  for select to anon, authenticated
  using (status = 'active' or owner_id = (select auth.uid()));
create policy "users request one pending store" on public.stores
  for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and status = 'pending'
    and public.has_role('customer')
  );
create policy "owners update active store details" on public.stores
  for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'active' and public.has_role('seller'))
  with check (owner_id = (select auth.uid()) and status = 'active' and public.has_role('seller'));
create policy "admin manages stores" on public.stores
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "delivery zones public when enabled" on public.store_delivery_zones
  for select to anon, authenticated using (
    is_active and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active')
  );
create policy "store owners manage delivery zones" on public.store_delivery_zones
  for all to authenticated
  using (
    public.has_role('seller') and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  )
  with check (
    public.has_role('seller') and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );
create policy "admin manages delivery zones" on public.store_delivery_zones
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "active products public, owner or admin" on public.products
  for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active'))
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()))
  );
create policy "seller inserts own products" on public.products
  for insert to authenticated
  with check (
    public.has_role('seller') and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );
create policy "seller updates own products" on public.products
  for update to authenticated
  using (
    public.has_role('seller') and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  )
  with check (
    public.has_role('seller') and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );
create policy "seller deletes own products" on public.products
  for delete to authenticated
  using (
    public.has_role('seller') and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );
create policy "admin manages products" on public.products
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "product images public for active products" on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p join public.stores s on s.id = p.store_id
      where p.id = product_id and p.is_active and s.status = 'active'
    )
  );
create policy "admin manages product images" on public.product_images
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));
create policy "seller manages own product images" on public.product_images
  for all to authenticated
  using (
    public.has_role('seller') and exists (
      select 1 from public.products p join public.stores s on s.id = p.store_id
      where p.id = product_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  )
  with check (
    public.has_role('seller') and exists (
      select 1 from public.products p join public.stores s on s.id = p.store_id
      where p.id = product_id and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );

create policy "customers manage own addresses" on public.addresses
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "customers and admins read orders" on public.orders
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.has_role('admin')
    or public.owns_store_order(id)
  );
create policy "buyers, store owners and admins read store orders" on public.store_orders
  for select to authenticated
  using (
    public.has_role('admin')
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()))
  );
create policy "admins manage store orders" on public.store_orders
  for all to authenticated using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "authorized users read order items" on public.order_items
  for select to authenticated
  using (
    public.has_role('admin') or exists (
      select 1 from public.store_orders so
      join public.orders o on o.id = so.order_id
      join public.stores s on s.id = so.store_id
      where so.id = store_order_id
        and (o.customer_id = (select auth.uid()) or s.owner_id = (select auth.uid()))
    )
  );
create policy "authorized users read order history" on public.order_status_history
  for select to authenticated
  using (
    public.has_role('admin') or exists (
      select 1 from public.store_orders so
      join public.orders o on o.id = so.order_id
      join public.stores s on s.id = so.store_id
      where so.id = store_order_id
        and (o.customer_id = (select auth.uid()) or s.owner_id = (select auth.uid()))
    )
  );

-- Only this transaction can create orders. Client-supplied totals and prices are ignored.
create or replace function public.place_order(p_items jsonb, p_address_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_store_order_id uuid;
  v_product_id uuid;
  v_address public.addresses%rowtype;
  v_product public.products%rowtype;
  v_store_id uuid;
  v_city_name text;
  v_qty integer;
  v_store_subtotal bigint;
  v_fee bigint;
  v_subtotal bigint := 0;
  v_delivery bigint := 0;
  v_total bigint := 0;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'invalid order items' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where coalesce(item ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(item ->> 'quantity', '') !~ '^[1-9][0-9]{0,2}$'
  ) then raise exception 'invalid order item values' using errcode = '22023'; end if;
  if exists (
    select 1 from (
      select (item ->> 'product_id')::uuid as product_id, sum((item ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(p_items) item group by 1
    ) requested where requested.quantity > 99
  ) then raise exception 'quantity limit exceeded' using errcode = '22023'; end if;

  select * into v_address from public.addresses a
  where a.id = p_address_id and a.user_id = v_user_id;
  if not found then raise exception 'address not found' using errcode = 'P0002'; end if;
  select c.name into v_city_name from public.cities c where c.id = v_address.city_id and c.is_active;
  if v_city_name is null then raise exception 'delivery area is unavailable' using errcode = '22023'; end if;

  -- Lock stock rows in a consistent order to avoid concurrent overselling.
  for v_product_id in
    select distinct (item ->> 'product_id')::uuid
    from jsonb_array_elements(p_items) item
    order by 1
  loop
    perform 1 from public.products p where p.id = v_product_id for update;
  end loop;

  for v_product_id, v_qty in
    select (item ->> 'product_id')::uuid, sum((item ->> 'quantity')::integer)::integer
    from jsonb_array_elements(p_items) item
    group by 1 order by 1
  loop
    select * into v_product from public.products p where p.id = v_product_id;
    if not found or not v_product.is_active or v_product.stock_count < v_qty then
      raise exception 'product unavailable or stock changed' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.stores s
      where s.id = v_product.store_id and s.status = 'active'
    ) then raise exception 'store unavailable' using errcode = '22023'; end if;
    if not exists (
      select 1 from public.store_delivery_zones z
      where z.store_id = v_product.store_id and z.city_id = v_address.city_id and z.is_active
    ) then raise exception 'delivery unavailable for this area' using errcode = '22023'; end if;
  end loop;

  select coalesce(sum(p.price_syp * requested.quantity), 0)
    into v_subtotal
  from (
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) item group by 1
  ) requested join public.products p on p.id = requested.product_id;

  select coalesce(sum(z.fee_syp), 0)
    into v_delivery
  from (
    select distinct p.store_id
    from jsonb_array_elements(p_items) item
    join public.products p on p.id = (item ->> 'product_id')::uuid
  ) requested
  join public.store_delivery_zones z
    on z.store_id = requested.store_id and z.city_id = v_address.city_id and z.is_active;

  v_total := v_subtotal + v_delivery;
  insert into public.orders (
    customer_id, address_snapshot, status, payment_method, currency,
    subtotal_syp, delivery_fee_syp, total_syp
  ) values (
    v_user_id,
    jsonb_build_object(
      'recipient_name', v_address.recipient_name,
      'phone', v_address.phone,
      'city', v_city_name,
      'address_line', v_address.address_line,
      'delivery_notes', v_address.delivery_notes
    ),
    'new', 'cod', 'SYP', v_subtotal, v_delivery, v_total
  ) returning id into v_order_id;

  for v_store_id in
    select distinct p.store_id
    from jsonb_array_elements(p_items) item
    join public.products p on p.id = (item ->> 'product_id')::uuid
    order by p.store_id
  loop
    select coalesce(sum(p.price_syp * requested.quantity), 0)
      into v_store_subtotal
    from (
      select (item ->> 'product_id')::uuid as product_id,
             sum((item ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) item group by 1
    ) requested join public.products p on p.id = requested.product_id
    where p.store_id = v_store_id;

    select z.fee_syp into v_fee from public.store_delivery_zones z
      where z.store_id = v_store_id and z.city_id = v_address.city_id and z.is_active;

    insert into public.store_orders (order_id, store_id, status, subtotal_syp, delivery_fee_syp, total_syp)
    values (v_order_id, v_store_id, 'new', v_store_subtotal, v_fee, v_store_subtotal + v_fee)
    returning id into v_store_order_id;

    for v_product_id, v_qty in
      select (item ->> 'product_id')::uuid, sum((item ->> 'quantity')::integer)::integer
      from jsonb_array_elements(p_items) item
      join public.products p on p.id = (item ->> 'product_id')::uuid
      where p.store_id = v_store_id
      group by 1 order by 1
    loop
      select * into v_product from public.products p where p.id = v_product_id;
      insert into public.order_items (
        store_order_id, product_id, product_name_snapshot, unit_price_syp, quantity, line_total_syp
      ) values (
        v_store_order_id, v_product.id, v_product.name, v_product.price_syp, v_qty, v_product.price_syp * v_qty
      );
      update public.products set stock_count = stock_count - v_qty where id = v_product_id;
    end loop;
  end loop;

  return v_order_id;
end;
$$;

create or replace function public.update_store_order_status(
  p_store_order_id uuid,
  p_new_status public.order_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_status public.order_status;
  v_order_id uuid;
  v_store_id uuid;
begin
  select so.status, so.order_id, so.store_id
    into v_old_status, v_order_id, v_store_id
  from public.store_orders so
  where so.id = p_store_order_id
    and (
      public.has_role('admin')
      or (public.has_role('seller') and exists (
        select 1 from public.stores s where s.id = so.store_id and s.owner_id = v_user_id and s.status = 'active'
      ))
    )
  for update;

  if not found then raise exception 'order not found or not allowed' using errcode = '42501'; end if;
  if not (
    (v_old_status = 'new' and p_new_status in ('confirmed', 'cancelled')) or
    (v_old_status = 'confirmed' and p_new_status in ('preparing', 'cancelled')) or
    (v_old_status = 'preparing' and p_new_status in ('out_for_delivery', 'cancelled')) or
    (v_old_status = 'out_for_delivery' and p_new_status = 'completed')
  ) then raise exception 'invalid order status transition' using errcode = '22023'; end if;

  update public.store_orders set status = p_new_status where id = p_store_order_id;

  if p_new_status = 'cancelled' then
    update public.products p
      set stock_count = p.stock_count + oi.quantity
    from public.order_items oi
    where oi.store_order_id = p_store_order_id
      and oi.product_id = p.id;
  end if;

  update public.orders o set status = case
    when not exists (select 1 from public.store_orders so where so.order_id = v_order_id and so.status <> 'completed') then 'completed'::public.order_status
    when not exists (select 1 from public.store_orders so where so.order_id = v_order_id and so.status <> 'cancelled') then 'cancelled'::public.order_status
    when not exists (select 1 from public.store_orders so where so.order_id = v_order_id and so.status not in ('completed', 'cancelled')) then 'completed'::public.order_status
    when exists (select 1 from public.store_orders so where so.order_id = v_order_id and so.status = 'out_for_delivery') then 'out_for_delivery'::public.order_status
    when exists (select 1 from public.store_orders so where so.order_id = v_order_id and so.status = 'preparing') then 'preparing'::public.order_status
    when exists (select 1 from public.store_orders so where so.order_id = v_order_id and so.status = 'confirmed') then 'confirmed'::public.order_status
    else 'new'::public.order_status
  end where o.id = v_order_id;
end;
$$;

create or replace function public.approve_store(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  if not public.has_role('admin') then raise exception 'admin required' using errcode = '42501'; end if;
  update public.stores set status = 'active'
  where id = p_store_id and status = 'pending'
  returning owner_id into v_owner_id;
  if v_owner_id is null then raise exception 'pending store not found' using errcode = 'P0002'; end if;
  insert into public.user_roles (user_id, role) values (v_owner_id, 'seller')
  on conflict (user_id, role) do nothing;
end;
$$;

revoke all on table
  public.profiles, public.user_roles, public.cities, public.categories, public.stores,
  public.store_delivery_zones, public.products, public.product_images, public.addresses,
  public.orders, public.store_orders, public.order_items, public.order_status_history
from anon, authenticated;

revoke all on function public.place_order(jsonb, uuid) from public, anon;
revoke all on function public.update_store_order_status(uuid, public.order_status) from public, anon;
revoke all on function public.approve_store(uuid) from public, anon;
grant execute on function public.place_order(jsonb, uuid) to authenticated;
grant execute on function public.update_store_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.approve_store(uuid) to authenticated;
revoke all on function public.has_role(public.app_role) from public, anon;
revoke all on function public.owns_store_order(uuid) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.owns_store_order(uuid) to authenticated;

grant select on public.cities, public.categories, public.stores, public.store_delivery_zones, public.products, public.product_images to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.user_roles, public.orders, public.store_orders, public.order_items, public.order_status_history to authenticated;
grant insert, update, delete on public.stores, public.store_delivery_zones, public.products, public.product_images to authenticated;
grant select, insert, update, delete on public.cities, public.categories to authenticated;

-- Product image objects use: <store-uuid>/<product-uuid>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "shamna public reads product images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "shamna seller uploads own product images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.has_role('seller')
    and exists (
      select 1 from public.stores s
      join public.products p on p.store_id = s.id
      where s.id::text = (storage.foldername(name))[1]
        and p.id::text = (storage.foldername(name))[2]
        and s.owner_id = (select auth.uid())
        and s.status = 'active'
    )
  );
create policy "shamna seller updates own product images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.has_role('seller')
    and exists (
      select 1 from public.stores s
      join public.products p on p.store_id = s.id
      where s.id::text = (storage.foldername(name))[1]
        and p.id::text = (storage.foldername(name))[2]
        and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  )
  with check (
    bucket_id = 'product-images'
    and public.has_role('seller')
    and exists (
      select 1 from public.stores s
      join public.products p on p.store_id = s.id
      where s.id::text = (storage.foldername(name))[1]
        and p.id::text = (storage.foldername(name))[2]
        and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );
create policy "shamna seller deletes own product images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.has_role('seller')
    and exists (
      select 1 from public.stores s
      join public.products p on p.store_id = s.id
      where s.id::text = (storage.foldername(name))[1]
        and p.id::text = (storage.foldername(name))[2]
        and s.owner_id = (select auth.uid()) and s.status = 'active'
    )
  );
