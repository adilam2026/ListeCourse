-- ListeCourse — schéma initial
-- Un foyer (household) partage un catalogue (catégories/produits) et des listes
-- de courses quotidiennes. Toutes les données sont isolées par foyer via RLS.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Fonction utilitaire : met à jour updated_at automatiquement
-- ─────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- households — un foyer
-- ─────────────────────────────────────────────────────────────────────────
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Africa/Casablanca',
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- household_members — qui appartient à quel foyer, avec quelles capacités
-- Tout membre peut acheter/cocher. can_prepare et is_admin sont des capacités
-- additionnelles (une même personne peut cumuler les deux).
-- ─────────────────────────────────────────────────────────────────────────
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  can_prepare boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- Sécurité : vérifie si l'utilisateur courant appartient au foyer donné.
-- security definer pour éviter la récursion RLS sur household_members.
create or replace function is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid()
  );
$$;

create or replace function is_household_admin(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and user_id = auth.uid() and is_admin = true
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  icon text not null default 'other',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_household_idx on categories(household_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────
-- products — le catalogue
-- ─────────────────────────────────────────────────────────────────────────
create table products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  photo_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  priority boolean not null default false,
  created_at timestamptz not null default now()
);

create index products_household_idx on products(household_id, category_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────
-- shopping_lists — une liste par foyer par jour (jamais supprimée)
-- ─────────────────────────────────────────────────────────────────────────
create table shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  list_date date not null,
  status text not null default 'brouillon' check (status in ('brouillon', 'a_acheter', 'traitee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_saved_at timestamptz,
  closed_at timestamptz,
  unique (household_id, list_date)
);

create trigger shopping_lists_set_updated_at
  before update on shopping_lists
  for each row execute function set_updated_at();

-- Retourne (et crée si besoin) la liste du jour du foyer, selon son fuseau horaire.
create or replace function get_or_create_today_list(p_household_id uuid)
returns shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_today date;
  v_list shopping_lists;
begin
  if not is_household_member(p_household_id) then
    raise exception 'not a member of this household';
  end if;

  select timezone into v_tz from households where id = p_household_id;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select * into v_list from shopping_lists
    where household_id = p_household_id and list_date = v_today;

  if not found then
    insert into shopping_lists (household_id, list_date, status)
    values (p_household_id, v_today, 'brouillon')
    returning * into v_list;
  end if;

  return v_list;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- list_items — les produits d'une liste (catalogue ou libres)
-- ─────────────────────────────────────────────────────────────────────────
create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  free_text_name text,
  quantity text,
  note text,
  purchased boolean not null default false,
  purchased_by uuid references auth.users(id) on delete set null,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  constraint list_items_has_name check (product_id is not null or free_text_name is not null)
);

create index list_items_list_idx on list_items(list_id);

create or replace function list_items_household_id(p_list_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from shopping_lists where id = p_list_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
alter table households enable row level security;
alter table household_members enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table shopping_lists enable row level security;
alter table list_items enable row level security;

-- households : visible par ses membres
create policy households_select on households
  for select using (is_household_member(id));
create policy households_update_admin on households
  for update using (is_household_admin(id));

-- household_members : visible par les membres du même foyer, géré par l'admin
create policy household_members_select on household_members
  for select using (is_household_member(household_id));
create policy household_members_insert_self on household_members
  for insert with check (user_id = auth.uid());
create policy household_members_update_admin on household_members
  for update using (is_household_admin(household_id));
create policy household_members_delete_admin on household_members
  for delete using (is_household_admin(household_id));

-- categories : lues par tout membre, gérées par l'admin
create policy categories_select on categories
  for select using (is_household_member(household_id));
create policy categories_write_admin on categories
  for insert with check (is_household_admin(household_id));
create policy categories_update_admin on categories
  for update using (is_household_admin(household_id));
create policy categories_delete_admin on categories
  for delete using (is_household_admin(household_id));

-- products : lus par tout membre, gérés par l'admin
create policy products_select on products
  for select using (is_household_member(household_id));
create policy products_write_admin on products
  for insert with check (is_household_admin(household_id));
create policy products_update_admin on products
  for update using (is_household_admin(household_id));
create policy products_delete_admin on products
  for delete using (is_household_admin(household_id));

-- shopping_lists : lues et modifiées (statut) par tout membre
create policy shopping_lists_select on shopping_lists
  for select using (is_household_member(household_id));
create policy shopping_lists_update on shopping_lists
  for update using (is_household_member(household_id));

-- list_items : lus et modifiés par tout membre du foyer de la liste
create policy list_items_select on list_items
  for select using (is_household_member(list_items_household_id(list_id)));
create policy list_items_insert on list_items
  for insert with check (is_household_member(list_items_household_id(list_id)));
create policy list_items_update on list_items
  for update using (is_household_member(list_items_household_id(list_id)));
create policy list_items_delete on list_items
  for delete using (is_household_member(list_items_household_id(list_id)));

-- ─────────────────────────────────────────────────────────────────────────
-- Création / adhésion à un foyer (bypass le poulet-et-l'œuf des policies)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function create_household(p_name text, p_display_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
begin
  insert into households (name) values (p_name) returning * into v_household;
  insert into household_members (household_id, user_id, display_name, can_prepare, is_admin)
    values (v_household.id, auth.uid(), p_display_name, true, true);
  return v_household;
end;
$$;

create or replace function join_household(p_invite_code text, p_display_name text, p_can_prepare boolean)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
begin
  select * into v_household from households where invite_code = upper(p_invite_code);
  if not found then
    raise exception 'invalid_invite_code';
  end if;

  insert into household_members (household_id, user_id, display_name, can_prepare, is_admin)
    values (v_household.id, auth.uid(), p_display_name, p_can_prepare, false)
    on conflict (household_id, user_id) do update set display_name = excluded.display_name;

  return v_household;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table list_items;
alter publication supabase_realtime add table shopping_lists;

-- ─────────────────────────────────────────────────────────────────────────
-- Stockage des photos produits
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;

-- Chemin attendu : {household_id}/{product_id}.jpg — lecture publique (bucket public),
-- écriture réservée aux admins du foyer correspondant.
create policy product_photos_admin_write on storage.objects
  for insert with check (
    bucket_id = 'product-photos'
    and is_household_admin((storage.foldername(name))[1]::uuid)
  );
create policy product_photos_admin_update on storage.objects
  for update using (
    bucket_id = 'product-photos'
    and is_household_admin((storage.foldername(name))[1]::uuid)
  );
create policy product_photos_admin_delete on storage.objects
  for delete using (
    bucket_id = 'product-photos'
    and is_household_admin((storage.foldername(name))[1]::uuid)
  );
