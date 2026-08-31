import { corsHeaders, json, requireHouseholdAdmin, serviceClient } from '../_shared/adminAuth.ts';

// Crée un membre "secondaire" du foyer (username + mot de passe/PIN,
// jamais d'email). Appelé par l'app avec le JWT de l'admin dans
// Authorization ; tout le travail privilégié (auth.admin.createUser) se
// fait ici, côté serveur, avec service_role — jamais côté client.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { household_id, username, password, display_name, role } = await req.json();

    if (!household_id || !username || !password || !display_name || !role) {
      return json({ error: 'missing_fields' }, 400);
    }
    if (!['admin', 'responsable', 'personnel'].includes(role)) {
      return json({ error: 'invalid_role' }, 400);
    }
    const cleanUsername = String(username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,32}$/.test(cleanUsername)) {
      return json({ error: 'invalid_username' }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: 'password_too_short' }, 400);
    }

    const adminId = await requireHouseholdAdmin(req, household_id);
    if (!adminId) return json({ error: 'not_authorized' }, 403);

    const admin = serviceClient();
    const email = `${cleanUsername}@${household_id}.listecourse.internal`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: display_name },
    });

    if (createError || !created?.user) {
      const isDup = createError?.message?.toLowerCase().includes('already');
      return json({ error: isDup ? 'username_taken' : 'create_failed', detail: createError?.message }, 400);
    }

    // Le trigger on_auth_user_created a déjà créé la ligne profiles (à
    // partir de user_metadata.name) au moment de l'insert ci-dessus : on la
    // complète plutôt que d'en insérer une seconde. password_set=true car
    // l'admin fournit un mot de passe réel immédiatement — ce compte
    // secondaire ne passe jamais par l'écran "créer votre mot de passe".
    const { error: profileError } = await admin
      .from('profiles')
      .update({ name: display_name, password_set: true })
      .eq('id', created.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: 'member_insert_failed', detail: profileError.message }, 400);
    }

    const { error: memberError } = await admin.from('household_members').insert({
      household_id,
      profile_id: created.user.id,
      username: cleanUsername,
      role,
      active: true,
    });

    if (memberError) {
      await admin.auth.admin.deleteUser(created.user.id);
      const isDup = memberError.message?.toLowerCase().includes('duplicate');
      return json({ error: isDup ? 'username_taken' : 'member_insert_failed', detail: memberError.message }, 400);
    }

    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    return json({ error: 'unexpected', detail: String(e) }, 500);
  }
});
