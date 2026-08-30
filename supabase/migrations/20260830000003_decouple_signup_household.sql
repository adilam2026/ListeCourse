-- Découplage strict "créer un compte" / "créer un foyer" (demande explicite
-- après tests) : signUp() ne doit plus jamais déclencher la création d'un
-- foyer, même indirectement. Le profil devient une conséquence automatique
-- et silencieuse de l'inscription (trigger DB, garanti avant même la
-- validation de l'OTP) ; le foyer devient un choix explicite et différé de
-- l'utilisateur, jamais un effet de bord du signup ou du premier login.

-- ─────────────────────────────────────────────────────────────────────────
-- Le profil est créé au moment même de l'insertion dans auth.users (donc
-- avant confirmation de l'email) — plus besoin d'un appel RPC de
-- "provisioning" après coup, plus de risque d'oubli.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), split_part(coalesce(new.email, 'Utilisateur'), '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'last_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────────────────
-- ensure_provisioned() disparaît : plus aucun chemin ne crée un foyer "tout
-- seul" au login/à la confirmation. "Authentifié sans foyer" est un état
-- normal désormais (voir AuthProvider), pas quelque chose à réparer.
-- ─────────────────────────────────────────────────────────────────────────
drop function if exists ensure_provisioned();

-- ─────────────────────────────────────────────────────────────────────────
-- create_household() : seule et unique porte d'entrée pour créer un foyer,
-- appelée uniquement quand l'utilisateur clique volontairement sur
-- "Créer mon foyer". Rejette explicitement (au lieu d'ignorer en silence)
-- un second appel si l'utilisateur a déjà un foyer, pour ne jamais créer de
-- doublon sur un double-tap tout en signalant clairement l'anomalie.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function create_household(p_name text)
returns table(household_id uuid, household_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_household households;
  v_code text;
  v_tries int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from household_members where profile_id = v_uid) then
    raise exception 'already_has_household';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'invalid_name';
  end if;

  loop
    v_code := generate_household_code(p_name);
    begin
      insert into households (name, code, created_by)
        values (trim(p_name), v_code, v_uid)
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

  raise log 'create_household: % created (%) by %', v_household.id, v_household.code, v_uid;

  return query select v_household.id, v_household.code;
end;
$$;

grant execute on function create_household(text) to authenticated;
