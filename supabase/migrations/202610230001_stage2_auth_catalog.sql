-- SHAMNA stage 2: auth profiles and public catalog foundation.
-- Local source only. Review against the target project's schema before applying.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'seller', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 180),
  description text not null default '' check (char_length(description) <= 4000),
  price_syp bigint not null check (price_syp > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_owner_idx on public.stores (owner_id);
create index stores_catalog_idx on public.stores (city_id, status);
create index products_catalog_idx on public.products (category_id, is_active, created_at desc);
create index products_store_idx on public.products (store_id, is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.has_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = requested_role
  );
$$;
revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name)
select u.id, nullif(btrim(u.raw_user_meta_data ->> 'display_name'), '')
from auth.users u
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'customer'
from auth.users u
on conflict (user_id, role) do nothing;

create or replace function public.protect_store_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service-role maintenance may operate without an end-user JWT.
  if (select auth.uid()) is null or public.has_role('admin') then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id or new.status is distinct from old.status then
    raise exception 'Only an administrator may change store ownership or status';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_store_privileged_fields() from public, anon, authenticated;
create trigger protect_store_fields before update on public.stores
  for each row execute function public.protect_store_privileged_fields();

insert into public.cities (name, slug) values
  ('قطنا', 'qatana'), ('جرمانا', 'jaramana')
on conflict (slug) do nothing;

insert into public.categories (name, slug) values
  ('مونة', 'pantry'), ('منزل', 'home'), ('أزياء', 'fashion'), ('عناية', 'care')
on conflict (slug) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;

revoke all on public.profiles, public.user_roles, public.cities, public.categories, public.stores, public.products from anon, authenticated;

grant select on public.cities, public.categories, public.stores, public.products to anon, authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert (owner_id, city_id, name, description) on public.stores to authenticated;
grant update (city_id, name, description, status, owner_id) on public.stores to authenticated;
grant insert (store_id, category_id, name, description, price_syp, stock_quantity, is_active) on public.products to authenticated;
grant update (category_id, name, description, price_syp, stock_quantity, is_active) on public.products to authenticated;
grant delete on public.products to authenticated;

create policy "profiles read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles update own display name" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "users read own roles" on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id or public.has_role('admin'));

create policy "active cities are public" on public.cities
  for select to anon, authenticated using (is_active);
create policy "active categories are public" on public.categories
  for select to anon, authenticated using (is_active);

create policy "approved stores and own store are visible" on public.stores
  for select to anon, authenticated
  using (status = 'approved' or (select auth.uid()) = owner_id or public.has_role('admin'));
create policy "users may request a store" on public.stores
  for insert to authenticated
  with check ((select auth.uid()) = owner_id and status = 'pending');
create policy "owners update own store details" on public.stores
  for update to authenticated
  using ((select auth.uid()) = owner_id or public.has_role('admin'))
  with check ((select auth.uid()) = owner_id or public.has_role('admin'));

create policy "active products from approved stores are public" on public.products
  for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.stores s where s.id = store_id and s.status = 'approved'
    ))
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()))
    or public.has_role('admin')
  );
create policy "store owners manage their products" on public.products
  for all to authenticated
  using (
    public.has_role('admin') or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'approved'
    )
  )
  with check (
    public.has_role('admin') or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = (select auth.uid()) and s.status = 'approved'
    )
  );
