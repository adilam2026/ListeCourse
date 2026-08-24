import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/AuthProvider';
import { useShoppingList } from '../../lib/useShoppingList';
import { useHouseholdMembers } from '../../lib/useHouseholdMembers';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radii } from '../../lib/theme';
import type { Category, ListItem, Product } from '../../lib/database.types';
import CategoryIcon, { CheckIcon } from '../../components/CategoryIcon';

interface Row {
  item: ListItem;
  label: string;
}

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const { household, session } = useAuth();
  const { list, categories, products, items, loading, error, setItems, setList } = useShoppingList(household?.id);
  const membersByUserId = useHouseholdMembers(household?.id);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [closing, setClosing] = useState(false);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const rowsByCategory = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const item of items) {
      const product = item.product_id ? productById.get(item.product_id) : undefined;
      const label = product?.name ?? item.free_text_name ?? 'Produit';
      const key = product?.category_id ?? 'autres';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ item, label });
    }
    return map;
  }, [items, productById]);

  const purchasedCount = items.filter((i) => i.purchased).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

  async function toggleItem(item: ListItem) {
    const nextPurchased = !item.purchased;
    const patch = {
      purchased: nextPurchased,
      purchased_by: nextPurchased ? session?.user.id ?? null : null,
      purchased_at: nextPurchased ? new Date().toISOString() : null,
    };
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    await supabase.from('list_items').update(patch).eq('id', item.id);
  }

  async function finishList() {
    if (!list) return;
    Alert.alert('Terminer cette liste de courses ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'default',
        onPress: async () => {
          setClosing(true);
          const { data } = await supabase
            .from('shopping_lists')
            .update({ status: 'traitee', closed_at: new Date().toISOString() })
            .eq('id', list.id)
            .select()
            .single();
          setClosing(false);
          if (data) setList(data);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !list) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Liste indisponible.'}</Text>
      </View>
    );
  }

  const dateLabel = new Date(list.list_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 120 }}>
        <View style={styles.header}>
          <Text style={styles.householdName}>{household?.name}</Text>
          <Text style={styles.title}>Courses du {dateLabel}</Text>

          {totalCount > 0 ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {purchasedCount} / {totalCount} produits achetés
                </Text>
                <Text style={styles.progressPct}>{progressPct} %</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
            </>
          ) : (
            <Text style={styles.emptyHint}>Aucun produit demandé pour l'instant.</Text>
          )}
        </View>

        {totalCount > 0 ? (
          <Pressable style={styles.hideRow} onPress={() => setHidePurchased((v) => !v)}>
            <Text style={styles.hideLabel}>Masquer les produits achetés</Text>
            <View style={[styles.switchTrack, hidePurchased && styles.switchTrackOn]}>
              <View style={[styles.switchKnob, hidePurchased && styles.switchKnobOn]} />
            </View>
          </Pressable>
        ) : null}

        {categories.map((cat) => {
          const rows = (rowsByCategory.get(cat.id) ?? []).filter((r) => !hidePurchased || !r.item.purchased);
          if (rows.length === 0) return null;
          return (
            <View key={cat.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <CategoryIcon icon={cat.icon} size={17} />
                <Text style={styles.sectionTitle}>{cat.name}</Text>
              </View>
              {rows.map(({ item, label }) => (
                <ItemRow key={item.id} item={item} label={label} onToggle={() => toggleItem(item)} membersByUserId={membersByUserId} />
              ))}
            </View>
          );
        })}

        {(() => {
          const rows = (rowsByCategory.get('autres') ?? []).filter((r) => !hidePurchased || !r.item.purchased);
          if (rows.length === 0) return null;
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CategoryIcon icon="other" size={17} />
                <Text style={styles.sectionTitle}>Autres</Text>
              </View>
              {rows.map(({ item, label }) => (
                <ItemRow key={item.id} item={item} label={label} onToggle={() => toggleItem(item)} membersByUserId={membersByUserId} />
              ))}
            </View>
          );
        })()}
      </ScrollView>

      {totalCount > 0 ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
          <Pressable style={styles.finishButton} onPress={finishList} disabled={closing}>
            {closing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.finishButtonLabel}>
                {list.status === 'traitee' ? 'Liste traitée ✓' : 'Terminer la liste'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ItemRow({
  item,
  label,
  onToggle,
  membersByUserId,
}: {
  item: ListItem;
  label: string;
  onToggle: () => void;
  membersByUserId: ReturnType<typeof useHouseholdMembers>;
}) {
  const buyerName = item.purchased_by ? membersByUserId[item.purchased_by]?.display_name : undefined;
  return (
    <Pressable style={[styles.itemRow, item.purchased && styles.itemRowPurchased]} onPress={onToggle}>
      <View style={[styles.checkbox, item.purchased && styles.checkboxChecked]}>
        {item.purchased ? <CheckIcon size={13} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemLabel, item.purchased && styles.itemLabelPurchased]}>{label}</Text>
        {item.purchased && buyerName ? <Text style={styles.boughtBy}>Acheté par {buyerName}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontFamily: fonts.bodyBold, color: colors.text, textAlign: 'center' },
  header: { paddingHorizontal: 20, backgroundColor: colors.surface, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  householdName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSoft },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 2, marginBottom: 14, textTransform: 'capitalize' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  progressText: { fontFamily: fonts.bodyExtraBold, fontSize: 14.5, color: colors.text },
  progressPct: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.success },
  progressTrack: { height: 10, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: colors.success },
  emptyHint: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft },
  hideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  hideLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSoft },
  switchTrack: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.border, padding: 3 },
  switchTrackOn: { backgroundColor: colors.accent },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  switchKnobOn: { alignSelf: 'flex-end' },
  section: { paddingHorizontal: 20, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15.5, color: colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1E7D8' },
  itemRowPurchased: { opacity: 0.55 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  itemLabelPurchased: { textDecorationLine: 'line-through', color: colors.textSoft },
  boughtBy: { fontFamily: fonts.bodyExtraBold, fontSize: 11.5, color: colors.success, marginTop: 1 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 14 },
  finishButton: { backgroundColor: colors.success, borderRadius: radii.md, paddingVertical: 16, alignItems: 'center' },
  finishButtonLabel: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
});
