import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { HouseholdMember } from './database.types';

export function useHouseholdMembers(householdId: string | undefined) {
  const [membersByUserId, setMembersByUserId] = useState<Record<string, HouseholdMember>>({});

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .then(({ data }) => {
        const map: Record<string, HouseholdMember> = {};
        for (const m of data ?? []) map[m.user_id] = m;
        setMembersByUserId(map);
      });
  }, [householdId]);

  return membersByUserId;
}
