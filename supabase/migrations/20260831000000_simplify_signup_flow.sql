-- Simplification du parcours d'inscription : Nom + Email uniquement, mot de
-- passe choisi APRÈS validation de l'OTP (pas avant). profiles.name
-- remplace first_name/last_name (un seul champ, plus simple).
--
-- password_set distingue "email vérifié mais mot de passe pas encore
-- configuré" (signup_password_pending) de "compte pleinement utilisable" —
-- c'est un état serveur durable, pas une variable locale perdue si l'app
-- est fermée entre la validation de l'OTP et la création du mot de passe.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles.name (remplace first_name/last_name)
-- ─────────────────────────────────────────────────────────────────────────
alter table profiles add column if not exists name text;
update profiles
  set name = coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'Utilisateur')
  where name is null;
alter table profiles alter column name set not null;
alter table profiles drop column if exists first_name;
alter table profiles drop column if exists last_name;

-- ─────────────────────────────────────────────────────────────────────────
-- profiles.password_set
-- Les comptes déjà existants (créés avant cette migration, avec un vrai mot
-- de passe choisi dès l'inscription) sont considérés comme déjà réglés :
-- backfill à true AVANT que la colonne ne prenne son défaut à false pour
-- les nouvelles inscriptions.
-- ─────────────────────────────────────────────────────────────────────────
alter table profiles add column if not exists password_set boolean;
update profiles set password_set = true where password_set is null;
alter table profiles alter column password_set set default false;
alter table profiles alter column password_set set not null;

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger de création du profil : lit "name" au lieu de first_name/last_name.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(coalesce(new.email, 'Utilisateur'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
