-- Refonte auth/rôles multi-foyer :
--   - le compte principal (créateur du foyer) garde un vrai email/mot de passe ;
--   - tous les autres membres sont créés PAR l'admin, avec un simple
--     "identifiant" (username, unique dans le foyer, pas globalement) et un
--     mot de passe/PIN — jamais d'email, jamais de mail de confirmation.
--
-- Ces comptes "secondaires" utilisent quand même de vrais comptes
-- auth.users Supabase (JWT, RLS, sessions inchangés), avec un email
-- synthétique dérivé de façon déterministe : <username>@<household_id>.listecourse.internal.
-- Le client ne connaît jamais cet email : il passe par resolve_login_email().

-- ─────────────────────────────────────────────────────────────────────────
-- household_members : rôle, identifiant, statut actif
-- ─────────────────────────────────────────────────────────────────────────
alter table household_members add column if not exists username text;
alter table household_members add column if not exists role text;
alter table household_members add column if not exists active boolean not null default true;

update household_members set role = case
  when is_admin then 'admin'
  when can_prepare then 'personnel'
  else 'responsable'
end
where role is null;

alter table household_members alter column role set not null;
alter table household_members add constraint household_members_role_check
  check (role in ('admin', 'responsable', 'personnel'));

alter table household_members drop column if exists is_admin;
alter table household_members drop column if exists can_prepare;

create unique index if not exists household_members_username_uidx
  on household_members (household_id, lower(username))
  where username is not null;

-- Plus d'auto-inscription directe dans un foyer : la seule voie d'entrée
-- pour un compte secondaire est l'Edge Function admin-create-user
-- (service_role), et pour l'admin fondateur, create_household() (security
-- definer). Sans cette policy, un utilisateur authentifié ne peut plus
-- s'auto-attribuer une ligne household_members (et donc un rôle/foyer)
-- par un simple insert direct.
drop policy if exists household_members_insert_self on household_members;

-- ─────────────────────────────────────────────────────────────────────────
-- households : traçabilité du créateur
-- ─────────────────────────────────────────────────────────────────────────
alter table households add column if not exists created_by uuid references auth.users(id);

update households h
set created_by = (
  select m.user_id from household_members m
  where m.household_id = h.id and m.role = 'admin'
  order by m.created_at
  limit 1
)
where created_by is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Sécurité : is_household_member / is_household_admin vérifient maintenant
-- aussi active=true, pour qu'un compte désactivé par l'admin perde
-- immédiatement tout accès aux données — même avec une session déjà ouverte.
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
    where household_id = p_household_id and user_id = auth.uid() and active = true
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
    where household_id = p_household_id and user_id = auth.uid()
      and role = 'admin' and active = true
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- create_household : le fondateur devient admin (inchangé dans l'esprit,
-- mis à jour pour le nouveau schéma role/active + created_by)
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
  insert into households (name, created_by) values (p_name, auth.uid()) returning * into v_household;
  insert into household_members (household_id, user_id, display_name, role, active)
    values (v_household.id, auth.uid(), p_display_name, 'admin', true);
  perform seed_default_catalog(v_household.id);
  return v_household;
end;
$$;

-- L'ancien parcours d'auto-inscription par code d'invitation n'existe plus :
-- seuls les Edge Functions (service_role) créent des comptes secondaires.
drop function if exists join_household(text, text, boolean);

-- ─────────────────────────────────────────────────────────────────────────
-- resolve_login_email : traduit (code foyer, identifiant) en email
-- synthétique pour signInWithPassword côté client. Ne révèle jamais si le
-- foyer/l'identifiant existe : retourne null dans tous les cas d'échec.
-- Callable sans session (avant connexion), d'où le grant à anon.
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
  select id into v_household_id from households where invite_code = upper(trim(p_invite_code));
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
