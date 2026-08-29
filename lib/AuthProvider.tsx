import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Household, HouseholdMember } from './database.types';
import { consumePendingHousehold } from './pendingHousehold';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  household: Household | null;
  member: HouseholdMember | null;
  isAdmin: boolean;
  isResponsable: boolean;
  isPersonnel: boolean;
  refreshHousehold: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [member, setMember] = useState<HouseholdMember | null>(null);

  async function loadHousehold(userId: string) {
    const { data: memberRow } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!memberRow) {
      // Cas typique : l'admin fondateur vient de confirmer son email et se
      // connecte pour la première fois — le foyer n'a pas encore pu être
      // créé au moment du signUp() (pas de session tant que non confirmé).
      const pending = await consumePendingHousehold();
      if (pending) {
        const { data: created } = await supabase.rpc('create_household', {
          p_name: pending.householdName,
          p_display_name: pending.displayName,
        });
        if (created) {
          return loadHousehold(userId);
        }
      }
      setMember(null);
      setHousehold(null);
      return;
    }

    const { data: householdRow } = await supabase
      .from('households')
      .select('*')
      .eq('id', memberRow.household_id)
      .maybeSingle();

    setMember(memberRow);
    setHousehold(householdRow ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadHousehold(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadHousehold(newSession.user.id);
      } else {
        setMember(null);
        setHousehold(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      household,
      member,
      isAdmin: member?.role === 'admin',
      isResponsable: member?.role === 'responsable',
      isPersonnel: member?.role === 'personnel',
      refreshHousehold: async () => {
        if (session?.user) await loadHousehold(session.user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session, household, member]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
