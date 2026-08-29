import { supabase } from './supabase';
import type { HouseholdRole } from './database.types';

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Merci de remplir tous les champs.',
  invalid_role: 'Rôle invalide.',
  invalid_username: "Identifiant invalide (lettres, chiffres, '.', '-', '_' uniquement).",
  password_too_short: 'Le mot de passe doit contenir au moins 6 caractères.',
  not_authorized: "Vous n'avez pas les droits pour cette action.",
  username_taken: 'Cet identifiant est déjà utilisé dans ce foyer.',
  create_failed: 'Impossible de créer cet utilisateur.',
  member_insert_failed: 'Impossible de créer cet utilisateur.',
  reset_failed: 'Impossible de réinitialiser le mot de passe.',
  cannot_delete_self: 'Vous ne pouvez pas supprimer votre propre accès.',
  unexpected: 'Une erreur inattendue est survenue.',
};

function friendlyError(code: string | undefined): string {
  return ERROR_MESSAGES[code ?? 'unexpected'] ?? ERROR_MESSAGES.unexpected;
}

export async function adminCreateUser(params: {
  householdId: string;
  username: string;
  password: string;
  displayName: string;
  role: HouseholdRole;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      household_id: params.householdId,
      username: params.username,
      password: params.password,
      display_name: params.displayName,
      role: params.role,
    },
  });
  if (error || !data?.ok) {
    return { ok: false, message: friendlyError(data?.error) };
  }
  return { ok: true };
}

export async function adminResetPassword(params: {
  householdId: string;
  memberUserId: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: {
      household_id: params.householdId,
      member_user_id: params.memberUserId,
      new_password: params.newPassword,
    },
  });
  if (error || !data?.ok) {
    return { ok: false, message: friendlyError(data?.error) };
  }
  return { ok: true };
}

export async function adminDeleteUser(params: {
  householdId: string;
  memberUserId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: {
      household_id: params.householdId,
      member_user_id: params.memberUserId,
    },
  });
  if (error || !data?.ok) {
    return { ok: false, message: friendlyError(data?.error) };
  }
  return { ok: true };
}
