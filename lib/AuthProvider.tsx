import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Household, HouseholdMember, Profile } from './database.types';

// Une seule source de vérité pour "où en est cet utilisateur" — chaque
// écran/garde ne lit QUE `status`, jamais de déduction locale.
//
//   bootstrapping             → lecture de la session au démarrage
//   signed_out                → aucune session (inclut : inscrit mais pas
//                                encore confirmé — l'écran "Confirmez votre
//                                email" est un flux de navigation local, pas
//                                un état global, puisqu'aucune session
//                                n'existe tant que l'email n'est pas confirmé)
//   authenticated_no_household → session valide, email confirmé, AUCUN foyer
//                                (état NORMAL, pas une erreur : l'utilisateur
//                                vient de s'inscrire et n'a pas encore créé
//                                ou rejoint de foyer)
//   ready                      → session + foyer + rôle
//   error                      → anomalie (accès désactivé, échec réseau...)
export type AuthStatus = 'bootstrapping' | 'signed_out' | 'authenticated_no_household' | 'ready' | 'error';

// Jamais de mot de passe, de token ou de refresh token dans ces logs — ce
// sont des repères d'état, pas un journal de debug complet.
function authLog(event: string, detail?: Record<string, unknown>) {
  console.log(`[auth] ${event}`, detail ?? '');
}

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  household: Household | null;
  member: HouseholdMember | null;
  isAdmin: boolean;
  isResponsable: boolean;
  isPersonnel: boolean;
  errorMessage: string | null;
  retry: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [member, setMember] = useState<HouseholdMember | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const evaluate = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);

    if (!currentSession?.user) {
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage(null);
      setStatus('signed_out');
      return;
    }

    // Défense en profondeur : Supabase refuse normalement la connexion d'un
    // compte principal non confirmé (Confirm email = ON), donc une session
    // sans email confirmé ne devrait jamais exister. Si ce cas survient
    // quand même, on ne laisse pas l'app dans un état ambigu.
    if (!currentSession.user.email_confirmed_at) {
      authLog('anomaly_unconfirmed_session', { user_id: currentSession.user.id });
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage("Votre adresse email n'est pas confirmée. Reconnectez-vous.");
      setStatus('error');
      return;
    }

    // Le profil est garanti par un trigger DB dès l'inscription (voir
    // migration decouple_signup_household) : pas de création ici.
    const { data: memberRow } = await supabase
      .from('household_members')
      .select('*')
      .eq('profile_id', currentSession.user.id)
      .limit(1)
      .maybeSingle();

    if (!memberRow) {
      // Compte authentifié, email confirmé, aucun foyer : état NORMAL.
      // On ne crée rien automatiquement — seul un clic explicite sur
      // "Créer mon foyer" appelle create_household().
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();
      authLog('authenticated_no_household', { user_id: currentSession.user.id });
      setProfile(profileRow ?? null);
      setHousehold(null);
      setMember(null);
      setErrorMessage(null);
      setStatus('authenticated_no_household');
      return;
    }

    if (!memberRow.active) {
      // Défense en profondeur (TEST désactivation) : un compte désactivé ne
      // doit jamais rester "visuellement connecté" — RLS bloquera les
      // données de toute façon, mais on ne laisse pas l'app dans un état
      // ambigu.
      authLog('membership_inactive', { user_id: currentSession.user.id, household_id: memberRow.household_id });
      await supabase.auth.signOut();
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage('Votre accès a été désactivé par un administrateur.');
      setStatus('error');
      return;
    }

    const [{ data: profileRow }, { data: householdRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle(),
      supabase.from('households').select('*').eq('id', memberRow.household_id).maybeSingle(),
    ]);

    authLog('ready', { user_id: currentSession.user.id, household_id: memberRow.household_id, role: memberRow.role });
    setProfile(profileRow ?? null);
    setMember(memberRow);
    setHousehold(householdRow ?? null);
    setErrorMessage(null);
    setStatus('ready');
  }, []);

  const retry = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await evaluate(data.session);
  }, [evaluate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      evaluate(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      evaluate(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, [evaluate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      household,
      member,
      isAdmin: member?.role === 'admin',
      isResponsable: member?.role === 'responsable',
      isPersonnel: member?.role === 'personnel',
      errorMessage,
      retry,
      signOut: async () => {
        authLog('signout', { user_id: session?.user?.id });
        await supabase.auth.signOut();
        // onAuthStateChange déclenchera evaluate(null) → status 'signed_out'.
        // Le garde de route ((app)/_layout.tsx) réagit à ce changement quel
        // que soit l'écran actuellement affiché.
      },
    }),
    [status, session, profile, household, member, errorMessage, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
