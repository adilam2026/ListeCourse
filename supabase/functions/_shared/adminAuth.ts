import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Client privilégié (service_role) : bypass RLS, seul habilité à créer/
// modifier/supprimer des comptes auth.users. SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement par la
// plateforme Edge Functions, jamais à définir manuellement.
export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

// Vérifie, à partir du JWT envoyé par l'appelant, qu'il est bien admin actif
// du foyer donné — jamais de confiance dans un rôle envoyé par le client.
// Réutilise is_household_admin() (RLS) en se faisant passer pour l'appelant
// via son propre token, plutôt que de dupliquer la logique de vérification.
export async function requireHouseholdAdmin(req: Request, householdId: string): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: isAdmin, error } = await callerClient.rpc('is_household_admin', {
    p_household_id: householdId,
  });
  if (error || isAdmin !== true) return null;

  const { data: userData } = await callerClient.auth.getUser();
  return userData?.user?.id ?? null;
}
