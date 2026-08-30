import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Household, HouseholdMember, Profile } from './database.types';

// Une seule source de vérité pour "où en est cet utilisateur" — chaque
// écran/garde ne lit QUE `status`, jamais de déduction locale.
//
//   bootstrapping             → lecture de la session au démarrage
//   signed_out                → aucune session
//   otp_pending                → inscription en cours, code envoyé, pas encore de session
//   authenticated_no_household → session valide, email confirmé, AUCUN foyer
//                                (état NORMAL, pas une erreur : l'utilisateur
//                                vient de s'inscrire et n'a pas encore créé
//                                ou rejoint de foyer)
//   ready                      → session + foyer + rôle
//   error                      → anomalie (accès désactivé, échec réseau...)
export type AuthStatus =
  | 'bootstrapping'
  | 'signed_out'
  | 'otp_pending'
  | 'authenticated_no_household'
  | 'ready'
  | 'error';

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
  pendingOtpEmail: string | null;
  beginEmailVerification: (email: string) => void;
  cancelEmailVerification: () => void;
  verifyOtp: (code: string) => Promise<{ ok: boolean; message?: string }>;
  resendOtp: () => Promise<{ ok: boolean; message?: string }>;
  retry: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Statut dérivé uniquement de la session Supabase (jamais de "otp_pending"
// ici : avant validation du code, aucune session n'existe encore).
type SessionStatus = 'bootstrapping' | 'signed_out' | 'authenticated_no_household' | 'ready' | 'error';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('bootstrapping');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [member, setMember] = useState<HouseholdMember | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(null);
  const pendingOtpEmailRef = useRef<string | null>(null);
  pendingOtpEmailRef.current = pendingOtpEmail;

  const evaluate = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);

    if (!currentSession?.user) {
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage(null);
      setSessionStatus('signed_out');
      return;
    }

    // Défense en profondeur : par construction (signUp + verifyOtp), une
    // session n'existe jamais sans email confirmé. Si ce cas survient quand
    // même (anomalie), on ne laisse pas l'app dans un état ambigu.
    if (!currentSession.user.email_confirmed_at) {
      authLog('anomaly_unconfirmed_session', { user_id: currentSession.user.id });
      setProfile(null);
      setHousehold(null);
      setMember(null);
      setErrorMessage("Votre adresse email n'est pas confirmée. Reconnectez-vous.");
      setSessionStatus('error');
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
      setSessionStatus('authenticated_no_household');
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
      setSessionStatus('error');
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
    setSessionStatus('ready');
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
      // Une session réelle apparaît (ex. verifyOtp() réussi) : le flux
      // d'inscription en cours est terminé, quel que soit son état.
      if (newSession) setPendingOtpEmail(null);
      evaluate(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, [evaluate]);

  const status: AuthStatus = pendingOtpEmail && sessionStatus === 'signed_out' ? 'otp_pending' : sessionStatus;

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
      pendingOtpEmail,
      beginEmailVerification: (email: string) => {
        authLog('signup_otp_sent');
        setPendingOtpEmail(email);
      },
      cancelEmailVerification: () => setPendingOtpEmail(null),
      verifyOtp: async (code: string) => {
        const email = pendingOtpEmailRef.current;
        if (!email) return { ok: false, message: "Session d'inscription expirée. Recommencez." };
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
        if (error) {
          authLog('otp_verification_failed');
          return { ok: false, message: 'Code incorrect ou expiré.' };
        }
        authLog('otp_verification_succeeded');
        // onAuthStateChange va recevoir la nouvelle session et ré-évaluer.
        return { ok: true };
      },
      resendOtp: async () => {
        const email = pendingOtpEmailRef.current;
        if (!email) return { ok: false, message: 'Aucune vérification en cours.' };
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
      retry,
      signOut: async () => {
        authLog('signout', { user_id: session?.user?.id });
        await supabase.auth.signOut();
        // onAuthStateChange déclenchera evaluate(null) → status 'signed_out'.
        // Le garde de route ((app)/_layout.tsx) réagit à ce changement quel
        // que soit l'écran actuellement affiché.
      },
    }),
    [status, session, profile, household, member, errorMessage, pendingOtpEmail, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
