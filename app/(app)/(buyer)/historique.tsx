import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, radii } from '../../../lib/theme';
import type { ShoppingList } from '../../../lib/database.types';
import { CheckIcon } from '../../../components/CategoryIcon';

interface Row {
  list: ShoppingList;
  total: number;
  purchased: number;
}

export default function HistoriqueScreen() {
  const insets = useSafeAreaInsets();
  const { household } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!household?.id) return;
    let cancelled = false;

    async function load() {
      const { data: lists } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('household_id', household!.id)
        .order('list_date', { ascending: false })
        .limit(30);

      if (!lists || lists.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }

      const { data: allItems } = await supabase
        .from('list_items')
        .select('list_id, purchased')
        .in(
          'list_id',
          lists.map((l) => l.id)
        );

      const counts = new Map<string, { total: number; purchased: number }>();
      for (const item of allItems ?? []) {
        const c = counts.get(item.list_id) ?? { total: 0, purchased: 0 };
        c.total += 1;
        if (item.purchased) c.purchased += 1;
        counts.set(item.list_id, c);
      }

      if (!cancelled) {
        setRows(
          lists.map((list) => ({
            list,
            total: counts.get(list.id)?.total ?? 0,
            purchased: counts.get(list.id)?.purchased ?? 0,
          }))
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [household?.id]);

  if (rows === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.subtitle}>Listes de courses précédentes</Text>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>Aucune liste pour l'instant.</Text>
      ) : (
        <View style={styles.card}>
          {rows.map(({ list, total, purchased }, index) => (
            <View key={list.id} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
              <View>
                <Text style={styles.rowDate}>
                  {new Date(list.list_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.rowMeta}>
                  {total} produit{total > 1 ? 's' : ''} · {purchased} acheté{purchased > 1 ? 's' : ''}
                </Text>
              </View>
              <StatusBadge status={list.status} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: ShoppingList['status'] }) {
  if (status === 'traitee') {
    return (
      <View style={styles.badgeSuccess}>
        <CheckIcon size={11} color={colors.success} />
        <Text style={styles.badgeSuccessLabel}>Traitée</Text>
      </View>
    );
  }
  if (status === 'a_acheter') {
    return (
      <View style={styles.badgeWarning}>
        <Text style={styles.badgeWarningLabel}>En cours</Text>
      </View>
    );
  }
  return (
    <View style={styles.badgeMuted}>
      <Text style={styles.badgeMutedLabel}>Brouillon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSoft, marginTop: 3 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, paddingHorizontal: 20, marginTop: 16 },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E7D8',
  },
  rowLast: { borderBottomWidth: 0 },
  rowDate: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text, textTransform: 'capitalize' },
  rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textSoft, marginTop: 2 },
  badgeSuccess: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E7F1E6', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  badgeSuccessLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 11.5, color: colors.success },
  badgeWarning: { backgroundColor: '#FBE9DE', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  badgeWarningLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 11.5, color: colors.warning },
  badgeMuted: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  badgeMutedLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 11.5, color: colors.textSoft },
});
