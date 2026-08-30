import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Household, HouseholdMember, Profile } from './database.types';

// Une seule source de vérité pour "où en est cet utilisateur", au lieu de
// déductions éparpillées (session ? household ? member ?) dans chaque
// écran. Chaque écran/garde ne lit QUE `status`.
export type AuthStatus =
  | 'bootstrapping'
  | 'signed_out'
  | 'needs_email_confirmation'
  | 'needs_provisioning'
  | 'error'
  | 'ready';

// Jamais de mot de passe, de token ou de refresh token dans ces logs — ce
// sont des repères d'état (spec §19), pas un journal de debug complet.
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
  resendConfirmationEmail: () => Promise<{ ok: boolean; message?: string }>;
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

    // Vérification explicite — ne jamais se fier uniquement au fait qu'une
    // session existe. Un compte secondaire créé par un admin est toujours
    // confirmé dès sa création (email_confirm: true côté Edge Function) ;
    // seul le compte fondateur (email réel) peut être ici en attente.
    if (!currentSession.user.email_confirmed_at) {
      authLog('needs_email_confirmation', { user_id: currentSession.user.id });
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage(null);
      setStatus('needs_email_confirmation');
      return;
    }

    const { data: memberRow } = await supabase
      .from('household_members')
      .select('*')
      .eq('profile_id', currentSession.user.id)
      .limit(1)
      .maybeSingle();

    if (memberRow) {
      if (!memberRow.active) {
        // Défense en profondeur (TEST 11) : un compte désactivé ne doit
        // jamais rester "visuellement connecté", même si son JWT est
        // techniquement encore valide — RLS bloquera les données de toute
        // façon, mais on ne laisse pas l'app dans un état ambigu.
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
      return;
    }

    // Pas d'adhésion : provisioning serveur idempotent (fondateur qui vient
    // de confirmer son email pour la première fois, ou état à réparer).
    const { data: provisioned, error: provisionError } = await supabase.rpc('ensure_provisioned');

    if (provisionError) {
      authLog('provisioning_failed', { user_id: currentSession.user.id, reason: provisionError.message });
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage(
        provisionError.message === 'no_household_pending'
          ? "Votre compte existe mais votre espace familial n'a pas pu être initialisé."
          : `Erreur d'initialisation du foyer : ${provisionError.message}`
      );
      setStatus(provisionError.message === 'no_household_pending' ? 'needs_provisioning' : 'error');
      return;
    }

    if (provisioned && provisioned.length > 0) {
      // Provisioning réussi : recharge l'état complet (profil, foyer, rôle).
      authLog('provisioning_succeeded', { user_id: currentSession.user.id, household_id: provisioned[0].household_id });
      return evaluate(currentSession);
    }

    setErrorMessage("Votre compte existe mais votre espace familial n'a pas pu être initialisé.");
    setStatus('needs_provisioning');
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
      resendConfirmationEmail: async () => {
        if (!session?.user?.email) return { ok: false, message: 'Aucun email associé à ce compte.' };
        const { error } = await supabase.auth.resend({ type: 'signup', email: session.user.email });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
      signOut: async () => {
        authLog('signout', { user_id: session?.user?.id });
        await supabase.auth.signOut();
        // onAuthStateChange déclenchera evaluate(null) → status 'signed_out'.
        // Le garde de route ((app)/_layout.tsx) réagit à ce changement quel
        // que soit l'écran actuellement affiché — plus de dépendance à un
        // appel manuel de navigation depuis chaque bouton "Déconnexion".
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
