-- Reconstruction propre du module identité/foyer :
--   auth.users ──1:1── profiles ──(household_members.profile_id)── households
--
-- Objectifs :
--   - séparer clairement identité (profiles) et appartenance à un foyer
--     (household_members), comme demandé ;
--   - un "code foyer" non ambigu, distinct du nom affiché ;
--   - un provisioning du foyer fondateur idempotent et 100% serveur (plus
--     de relais fragile côté client entre le signUp() et la confirmation
--     d'email) : les infos nécessaires voyagent dans les métadonnées
--     auth.users, lues par ensure_provisioned().

-- ─────────────────────────────────────────────────────────────────────────
-- profiles — identité applicative, 1:1 avec auth.users
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text,
  created_at timestamptz not null default now()
);

-- Backfill : un profil par membre existant, à partir de son display_name.
insert into profiles (id, first_name, last_name)
select distinct on (user_id) user_id, display_name, null
from household_members
on conflict (id) do nothing;

alter table household_members drop constraint if exists household_members_user_id_fkey;
alter table household_members rename column user_id to profile_id;
alter table household_members add constraint household_members_profile_id_fkey
  foreign key (profile_id) references profiles(id) on delete cascade;

-- Le nom affiché est un attribut de la personne (profiles), pas de son
-- adhésion à tel ou tel foyer.
alter table household_members drop column if exists display_name;

alter table profiles enable row level security;

create or replace function is_household_peer(p_target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members me
    join household_members them on them.household_id = me.household_id
    where me.profile_id = auth.uid() and them.profile_id = p_target_profile_id
      and me.active and them.active
  );
$$;

create policy profiles_select on profiles
  for select using (id = auth.uid() or is_household_peer(id));
create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- households : "code" = identifiant partageable non ambigu, distinct du nom
-- ─────────────────────────────────────────────────────────────────────────
alter table households rename column invite_code to code;

create or replace function generate_household_code(p_name text)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_suffix text := '';
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sans 0/O/1/I, ambigus à l'oral/écrit
  i int;
begin
  v_prefix := upper(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_prefix := substr(v_prefix || 'MAIS', 1, 4);
  for i in 1..4 loop
    v_suffix := v_suffix || substr(v_chars, (floor(random() * length(v_chars)) + 1)::int, 1);
  end loop;
  return v_prefix || '-' || v_suffix;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- is_household_member / is_household_admin : profile_id au lieu de user_id
-- ─────────────────────────────────────────────────────────────────────────
create or replace function is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id and profile_id = auth.uid() and active = true
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
    where household_id = p_household_id and profile_id = auth.uid()
      and role = 'admin' and active = true
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- ensure_provisioned() : idempotent, appelée après toute connexion réussie.
--   1. crée le profil s'il manque (à partir des métadonnées signUp) ;
--   2. si une adhésion existe déjà, ne fait rien de plus (idempotence) ;
--   3. sinon, si des métadonnées "household_name" sont présentes (fondateur
--      qui vient de confirmer son email), crée le foyer + l'adhésion admin.
--   Si aucun foyer n'existe et qu'aucune métadonnée n'est présente, lève
--   une exception explicite plutôt que de laisser un état ambigu.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function ensure_provisioned()
returns table(household_id uuid, member_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_household_name text;
  v_existing_household uuid;
  v_existing_role text;
  v_household households;
  v_code text;
  v_tries int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select raw_user_meta_data, email into v_meta, v_email from auth.users where id = v_uid;

  if not exists (select 1 from profiles where id = v_uid) then
    v_first_name := coalesce(nullif(trim(v_meta->>'first_name'), ''), split_part(coalesce(v_email, 'Utilisateur'), '@', 1));
    v_last_name := nullif(trim(v_meta->>'last_name'), '');
    insert into profiles (id, first_name, last_name) values (v_uid, v_first_name, v_last_name);
  end if;

  select hm.household_id, hm.role into v_existing_household, v_existing_role
    from household_members hm where hm.profile_id = v_uid limit 1;

  if v_existing_household is not null then
    return query select v_existing_household, v_existing_role;
    return;
  end if;

  v_household_name := nullif(trim(v_meta->>'household_name'), '');
  if v_household_name is null then
    raise exception 'no_household_pending';
  end if;

  loop
    v_code := generate_household_code(v_household_name);
    begin
      insert into households (name, code, created_by)
        values (v_household_name, v_code, v_uid)
        returning * into v_household;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 10 then
        raise exception 'code_generation_failed';
      end if;
    end;
  end loop;

  insert into household_members (household_id, profile_id, role, active)
    values (v_household.id, v_uid, 'admin', true);

  perform seed_default_catalog(v_household.id);

  return query select v_household.id, 'admin'::text;
end;
$$;

grant execute on function ensure_provisioned() to authenticated;

-- create_household() est remplacée par ensure_provisioned() (idempotent,
-- lit les métadonnées au lieu de recevoir les paramètres du client).
drop function if exists create_household(text, text);

-- ─────────────────────────────────────────────────────────────────────────
-- resolve_login_email : households.code (au lieu de invite_code)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function resolve_login_email(p_invite_code text, p_username text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_active boolean;
begin
  select id into v_household_id from households where code = upper(trim(p_invite_code));
  if v_household_id is null then
    return null;
  end if;

  select active into v_active from household_members
    where household_id = v_household_id and lower(username) = lower(trim(p_username));

  if v_active is distinct from true then
    return null;
  end if;

  return lower(trim(p_username)) || '@' || v_household_id::text || '.listecourse.internal';
end;
$$;

grant execute on function resolve_login_email(text, text) to anon, authenticated;
