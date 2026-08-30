import { corsHeaders, json, requireHouseholdAdmin, serviceClient } from '../_shared/adminAuth.ts';

// Réinitialise le mot de passe/PIN d'un membre du foyer. Les comptes
// secondaires n'ayant pas d'email, il n'y a pas de flux "mot de passe
// oublié" classique : c'est l'admin qui définit un nouveau mot de passe.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { household_id, member_user_id, new_password } = await req.json();

    if (!household_id || !member_user_id || !new_password) {
      return json({ error: 'missing_fields' }, 400);
    }
    if (String(new_password).length < 6) {
      return json({ error: 'password_too_short' }, 400);
    }

    const adminId = await requireHouseholdAdmin(req, household_id);
    if (!adminId) return json({ error: 'not_authorized' }, 403);

    const admin = serviceClient();

    // Le compte ciblé doit appartenir à CE foyer : ne fait jamais confiance
    // uniquement au contrôle "l'appelant est admin d'un foyer quelconque".
    const { data: member } = await admin
      .from('household_members')
      .select('id')
      .eq('profile_id', member_user_id)
      .eq('household_id', household_id)
      .maybeSingle();

    if (!member) return json({ error: 'not_authorized' }, 403);

    const { error } = await admin.auth.admin.updateUserById(member_user_id, {
      password: new_password,
    });
    if (error) return json({ error: 'reset_failed', detail: error.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'unexpected', detail: String(e) }, 500);
  }
});
