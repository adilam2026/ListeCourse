-- Durcissement demandé après validation de l'audit (section "points
-- impératifs") : normalisation garantie en base (pas seulement applicative),
-- traçabilité (updated_at), observabilité minimale des opérations critiques
-- de provisioning.

-- ─────────────────────────────────────────────────────────────────────────
-- is_household_peer : correctif. La version initiale exigeait that ALSO
-- la personne CIBLÉE soit active (them.active) pour être visible. Résultat :
-- dès qu'un admin désactive un utilisateur, le nom de cet utilisateur
-- disparaît (RLS bloque la lecture de son profil) alors que l'écran
-- "Utilisateurs du foyer" doit justement continuer à l'afficher (avec le
-- badge "désactivé"). Seul le lecteur doit être un membre actif ; la
-- personne consultée peut être active ou non.
-- ─────────────────────────────────────────────────────────────────────────
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
      and me.active
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at sur profiles et household_members (traçabilité des
-- changements de rôle / statut actif / nom).
-- ─────────────────────────────────────────────────────────────────────────
alter table profiles add column if not exists updated_at timestamptz not null default now();
alter table household_members add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists household_members_set_updated_at on household_members;
create trigger household_members_set_updated_at
  before update on household_members
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Normalisation garantie de username au niveau base : quel que soit le
-- chemin d'écriture (Edge Function, futur outil d'admin, correction
-- manuelle), "Florence" / "florence" / " FLORENCE " sont TOUJOURS la même
-- valeur stockée. L'unicité (household_id, lower(username)) existe déjà
-- (household_members_username_uidx) ; ce trigger la rend redondante avec
-- la casse/les espaces, donc réellement infaillible.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function normalize_household_member_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is not null then
    new.username := lower(trim(new.username));
  end if;
  return new;
end;
$$;

drop trigger if exists household_members_normalize_username on household_members;
create trigger household_members_normalize_username
  before insert or update on household_members
  for each row execute function normalize_household_member_username();

-- ─────────────────────────────────────────────────────────────────────────
-- ensure_provisioned() : ajout de logs serveur (raise log — visibles dans
-- les journaux Postgres du projet Supabase) sur les étapes critiques,
-- sans jamais logger de secret (mot de passe, token). Redéfinition
-- complète pour rester la version de référence unique de cette fonction.
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
    raise log 'ensure_provisioned: profile created for %', v_uid;
  end if;

  select hm.household_id, hm.role into v_existing_household, v_existing_role
    from household_members hm where hm.profile_id = v_uid limit 1;

  if v_existing_household is not null then
    -- Idempotence : adhésion déjà existante, aucune nouvelle écriture.
    return query select v_existing_household, v_existing_role;
    return;
  end if;

  v_household_name := nullif(trim(v_meta->>'household_name'), '');
  if v_household_name is null then
    raise log 'ensure_provisioned: no_household_pending for %', v_uid;
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
        raise log 'ensure_provisioned: code_generation_failed for %', v_uid;
        raise exception 'code_generation_failed';
      end if;
    end;
  end loop;

  insert into household_members (household_id, profile_id, role, active)
    values (v_household.id, v_uid, 'admin', true);

  perform seed_default_catalog(v_household.id);

  raise log 'ensure_provisioned: founding household % created for %', v_household.id, v_uid;

  return query select v_household.id, 'admin'::text;
end;
$$;

grant execute on function ensure_provisioned() to authenticated;
