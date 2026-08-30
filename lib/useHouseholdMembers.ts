import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { HouseholdMember, Profile } from './database.types';

export type HouseholdMemberWithProfile = HouseholdMember & { profile: Profile | null };

export function useHouseholdMembers(householdId: string | undefined) {
  const [membersByProfileId, setMembersByProfileId] = useState<Record<string, HouseholdMemberWithProfile>>({});

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from('household_members')
      .select('*, profile:profiles(*)')
      .eq('household_id', householdId)
      .then(({ data }) => {
        const map: Record<string, HouseholdMemberWithProfile> = {};
        for (const m of (data as unknown as HouseholdMemberWithProfile[]) ?? []) map[m.profile_id] = m;
        setMembersByProfileId(map);
      });
  }, [householdId]);

  return membersByProfileId;
}
