import { corsHeaders, json, requireHouseholdAdmin, serviceClient } from '../_shared/adminAuth.ts';

// Supprime définitivement l'accès d'un membre : la ligne household_members
// ET le compte auth.users (sinon un compte orphelin resterait, inutilisable
// mais présent). Pour un simple blocage réversible, préférer désactiver
// (colonne active, gérée directement côté client via RLS) plutôt que
// supprimer.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { household_id, member_user_id } = await req.json();
    if (!household_id || !member_user_id) return json({ error: 'missing_fields' }, 400);

    const adminId = await requireHouseholdAdmin(req, household_id);
    if (!adminId) return json({ error: 'not_authorized' }, 403);

    if (member_user_id === adminId) {
      return json({ error: 'cannot_delete_self' }, 400);
    }

    const admin = serviceClient();

    const { data: member } = await admin
      .from('household_members')
      .select('id')
      .eq('profile_id', member_user_id)
      .eq('household_id', household_id)
      .maybeSingle();

    if (!member) return json({ error: 'not_authorized' }, 403);

    await admin.from('household_members').delete().eq('id', member.id);
    await admin.auth.admin.deleteUser(member_user_id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'unexpected', detail: String(e) }, 500);
  }
});
