import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radii } from '../../lib/theme';
import type { HouseholdMember } from '../../lib/database.types';
import { AdminHeader } from '../../components/AdminHeader';
import { ChevronRightIcon, PlusIcon } from '../../components/CategoryIcon';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  responsable: 'Responsable du foyer',
  personnel: 'Personnel de maison',
};

export default function UtilisateursScreen() {
  const insets = useSafeAreaInsets();
  const { household, member: currentMember } = useAuth();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!household?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at');
    setMembers(data ?? []);
    setLoading(false);
  }, [household?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <AdminHeader title="Utilisateurs du foyer" tab="utilisateurs" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={colors.accent} />
        ) : (
          <View style={styles.card}>
            {members.map((m, idx) => (
              <Pressable
                key={m.id}
                style={[styles.row, idx === members.length - 1 && styles.rowLast, !m.active && styles.rowInactive]}
                onPress={() => router.push({ pathname: '/admin/utilisateur/[id]', params: { id: m.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {m.display_name}
                    {m.user_id === currentMember?.user_id ? ' (vous)' : ''}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {ROLE_LABELS[m.role] ?? m.role}
                    {m.username ? ` · ${m.username}` : ''}
                    {!m.active ? ' · désactivé' : ''}
                  </Text>
                </View>
                <ChevronRightIcon />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/admin/utilisateur/nouveau')}
      >
        <PlusIcon size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E7D8',
  },
  rowLast: { borderBottomWidth: 0 },
  rowInactive: { opacity: 0.5 },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textSoft, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
