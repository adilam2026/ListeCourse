import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/AuthProvider';
import { useShoppingList } from '../../lib/useShoppingList';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radii } from '../../lib/theme';
import type { Product } from '../../lib/database.types';
import CategoryIcon, { CheckIcon, PlusIcon, SearchIcon } from '../../components/CategoryIcon';
import ProductPhoto from '../../components/ProductPhoto';

export default function PreparateurScreen() {
  const insets = useSafeAreaInsets();
  const { household, signOut } = useAuth();
  const { list, categories, products, items, loading, error, setItems } = useShoppingList(household?.id);
  const [query, setQuery] = useState('');
  const [freeItemText, setFreeItemText] = useState('');
  const [showFreeInput, setShowFreeInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const selectedProductIds = useMemo(
    () => new Set(items.filter((i) => i.product_id).map((i) => i.product_id as string)),
    [items]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filteredProducts) {
      const key = p.category_id ?? 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filteredProducts]);

  async function toggleProduct(product: Product) {
    if (!list) return;
    const isSelected = selectedProductIds.has(product.id);
    if (isSelected) {
      const existing = items.find((i) => i.product_id === product.id);
      if (!existing) return;
      setItems((prev) => prev.filter((i) => i.id !== existing.id));
      await supabase.from('list_items').delete().eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('list_items')
        .insert({ list_id: list.id, product_id: product.id })
        .select()
        .single();
      if (data) setItems((prev) => (prev.some((i) => i.id === data.id) ? prev : [...prev, data]));
    }
  }

  async function addFreeItem() {
    if (!list || !freeItemText.trim()) return;
    const name = freeItemText.trim();
    setFreeItemText('');
    setShowFreeInput(false);
    const { data } = await supabase
      .from('list_items')
      .insert({ list_id: list.id, free_text_name: name })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data]);
  }

  async function saveList() {
    if (!list) return;
    setSaving(true);
    const isFirstSave = list.status === 'brouillon';
    await supabase
      .from('shopping_lists')
      .update({
        status: 'a_acheter',
        first_saved_at: isFirstSave ? new Date().toISOString() : list.first_saved_at,
      })
      .eq('id', list.id);
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
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

  const selectedCount = items.length;
  const dateLabel = new Date(list.list_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.householdName}>{household?.name}</Text>
            <Text style={styles.title}>Courses du jour</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <Pressable onPress={signOut} hitSlop={10}>
            <Text style={styles.adminLink}>Déconnexion</Text>
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un produit"
            placeholderTextColor={colors.textSoft}
            style={styles.searchInput}
          />
        </View>

        {categories.map((cat) => {
          const catProducts = productsByCategory.get(cat.id) ?? [];
          if (catProducts.length === 0) return null;
          return (
            <View key={cat.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <CategoryIcon icon={cat.icon} />
                <Text style={styles.sectionTitle}>{cat.name}</Text>
              </View>
              <View style={styles.grid}>
                {catProducts.map((product) => {
                  const selected = selectedProductIds.has(product.id);
                  return (
                    <Pressable
                      key={product.id}
                      style={[styles.card, selected && styles.cardSelected]}
                      onPress={() => toggleProduct(product)}
                    >
                      {selected ? (
                        <View style={styles.checkBadge}>
                          <CheckIcon />
                        </View>
                      ) : null}
                      <ProductPhoto uri={product.photo_url} />
                      <Text style={styles.cardLabel} numberOfLines={2}>
                        {product.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.freeItemWrap}>
          {showFreeInput ? (
            <View style={styles.freeItemInputRow}>
              <TextInput
                autoFocus
                value={freeItemText}
                onChangeText={setFreeItemText}
                placeholder="Ex. Ampoule cuisine"
                placeholderTextColor={colors.textFaint}
                style={styles.freeItemInput}
                onSubmitEditing={addFreeItem}
                returnKeyType="done"
              />
              <Pressable style={styles.freeItemConfirm} onPress={addFreeItem}>
                <Text style={styles.freeItemConfirmLabel}>Ajouter</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.freeItemButton} onPress={() => setShowFreeInput(true)}>
              <PlusIcon />
              <Text style={styles.freeItemButtonLabel}>Ajouter autre chose</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {selectedCount > 0 ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
          <View>
            <Text style={styles.bottomBarCount}>
              {selectedCount} produit{selectedCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.bottomBarSub}>{savedFlash ? 'Enregistré ✓' : 'sélectionnés'}</Text>
          </View>
          <Pressable style={styles.saveButton} onPress={saveList} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonLabel}>Enregistrer la liste</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontFamily: fonts.bodyBold, color: colors.text, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 4 },
  householdName: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.textSoft, letterSpacing: 0.2 },
  title: { fontFamily: fonts.display, fontSize: 27, color: colors.text, marginTop: 2 },
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.textSoft, marginTop: 3, textTransform: 'capitalize' },
  adminLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent, marginTop: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14.5, color: colors.text },
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  card: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingVertical: 15,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: '#FCF1E9' },
  checkBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cardLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  freeItemWrap: { paddingHorizontal: 20, marginTop: 24 },
  freeItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  freeItemButtonLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSoft },
  freeItemInputRow: { flexDirection: 'row', gap: 10 },
  freeItemInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.text,
  },
  freeItemConfirm: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  freeItemConfirmLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarCount: { fontFamily: fonts.bodyExtraBold, fontSize: 16, color: colors.text },
  bottomBarSub: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textSoft },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  saveButtonLabel: { fontFamily: fonts.display, fontSize: 14.5, color: '#fff' },
});
