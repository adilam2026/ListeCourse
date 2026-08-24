import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
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
import { supabase } from '../../lib/supabase';
import { colors, fonts, radii } from '../../lib/theme';
import type { Category, Product } from '../../lib/database.types';
import { AdminHeader } from '../../components/AdminHeader';
import { PlusIcon, SearchIcon, ChevronRightIcon } from '../../components/CategoryIcon';
import ProductPhoto from '../../components/ProductPhoto';

type Filter = 'tous' | 'actifs' | 'desactives' | 'avec_photo' | 'sans_photo';

export default function CatalogueScreen() {
  const insets = useSafeAreaInsets();
  const { household } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  async function load() {
    if (!household?.id) return;
    setLoading(true);
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').eq('household_id', household.id).order('sort_order'),
      supabase.from('products').select('*').eq('household_id', household.id).order('sort_order'),
    ]);
    setCategories(cats ?? []);
    setProducts(prods ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filter === 'actifs' && !p.active) return false;
      if (filter === 'desactives' && p.active) return false;
      if (filter === 'avec_photo' && !p.photo_url) return false;
      if (filter === 'sans_photo' && p.photo_url) return false;
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      return true;
    });
  }, [products, query, filter, categoryFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.category_id ?? 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtered]);

  async function toggleActive(product: Product) {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)));
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <AdminHeader title="Catalogue" tab="produits" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.searchBar}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher dans le catalogue"
            placeholderTextColor={colors.textSoft}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {(
            [
              ['tous', `Tous · ${products.length}`],
              ['actifs', 'Actifs'],
              ['desactives', 'Désactivés'],
              ['avec_photo', 'Avec photo'],
              ['sans_photo', 'Sans photo'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <Pressable key={key} style={[styles.chip, filter === key && styles.chipActive]} onPress={() => setFilter(key)}>
              <Text style={[styles.chipLabel, filter === key && styles.chipLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 6 }}>
          <Pressable style={[styles.chip, !categoryFilter && styles.chipActive]} onPress={() => setCategoryFilter(null)}>
            <Text style={[styles.chipLabel, !categoryFilter && styles.chipLabelActive]}>Toutes catégories</Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, categoryFilter === c.id && styles.chipActive]}
              onPress={() => setCategoryFilter(c.id)}
            >
              <Text style={[styles.chipLabel, categoryFilter === c.id && styles.chipLabelActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={colors.accent} />
        ) : (
          categories
            .filter((c) => (byCategory.get(c.id) ?? []).length > 0)
            .map((cat) => (
              <View key={cat.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{cat.name}</Text>
                <View style={styles.card}>
                  {(byCategory.get(cat.id) ?? []).map((product, idx, arr) => (
                    <View key={product.id} style={[styles.row, idx === arr.length - 1 && styles.rowLast]}>
                      <Pressable
                        style={styles.rowMain}
                        onPress={() => router.push({ pathname: '/admin/produit/[id]', params: { id: product.id } })}
                      >
                        <ProductPhoto uri={product.photo_url} size={44} radius={11} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{product.name}</Text>
                          <Text style={styles.rowMeta}>
                            {cat.name}
                            {product.priority ? ' · prioritaire' : ''}
                            {!product.photo_url ? ' · sans photo' : ''}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={[styles.miniSwitchTrack, product.active && styles.miniSwitchTrackOn]}
                        onPress={() => toggleActive(product)}
                      >
                        <View style={[styles.miniSwitchKnob, product.active && styles.miniSwitchKnobOn]} />
                      </Pressable>
                      <ChevronRightIcon />
                    </View>
                  ))}
                </View>
              </View>
            ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push({ pathname: '/admin/produit/[id]', params: { id: 'new' } })}
      >
        <PlusIcon size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  chipRow: { marginTop: 14, flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textSoft },
  chipLabelActive: { color: '#fff' },
  section: { paddingHorizontal: 20, marginTop: 18 },
  sectionTitle: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1E7D8' },
  rowLast: { borderBottomWidth: 0 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textSoft, marginTop: 1 },
  miniSwitchTrack: { width: 36, height: 22, borderRadius: 11, backgroundColor: colors.borderStrong, padding: 3 },
  miniSwitchTrackOn: { backgroundColor: colors.accent },
  miniSwitchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  miniSwitchKnobOn: { alignSelf: 'flex-end' },
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
