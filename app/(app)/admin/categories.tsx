import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../lib/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors, fonts, radii } from '../../../lib/theme';
import type { Category } from '../../../lib/database.types';
import { AdminHeader } from '../../../components/AdminHeader';
import CategoryIcon, { PlusIcon } from '../../../components/CategoryIcon';
import Svg, { Path } from 'react-native-svg';

const ICON_OPTIONS = [
  'legumes', 'fruits', 'dairy', 'grocery', 'breakfast',
  'meat', 'fish', 'drinks', 'household', 'hygiene', 'children', 'other',
];

function ArrowIcon({ direction, color }: { direction: 'up' | 'down'; color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d={direction === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { household } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('other');

  async function load() {
    if (!household?.id) return;
    setLoading(true);
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .order('sort_order');
    const { data: prods } = await supabase.from('products').select('category_id').eq('household_id', household.id);
    const c: Record<string, number> = {};
    for (const p of prods ?? []) {
      if (p.category_id) c[p.category_id] = (c[p.category_id] ?? 0) + 1;
    }
    setCounts(c);
    setCategories(cats ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function toggleActive(cat: Category) {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, active: !c.active } : c)));
    await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const a = categories[index];
    const b = categories[target];
    const next = [...categories];
    next[index] = { ...b, sort_order: a.sort_order };
    next[target] = { ...a, sort_order: b.sort_order };
    setCategories(next.sort((x, y) => x.sort_order - y.sort_order));
    await Promise.all([
      supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) return;
    setCategories((prev) => prev.map((c) => (c.id === editingId ? { ...c, name: editingName.trim() } : c)));
    await supabase.from('categories').update({ name: editingName.trim() }).eq('id', editingId);
    setEditingId(null);
  }

  function confirmDelete(cat: Category) {
    if ((counts[cat.id] ?? 0) > 0) {
      Alert.alert('Catégorie utilisée', 'Déplacez ou supprimez d’abord les produits de cette catégorie.');
      return;
    }
    Alert.alert('Supprimer cette catégorie ?', cat.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('categories').delete().eq('id', cat.id);
          setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        },
      },
    ]);
  }

  async function createCategory() {
    if (!household?.id || !newName.trim()) return;
    const nextOrder = (categories[categories.length - 1]?.sort_order ?? 0) + 1;
    const { data } = await supabase
      .from('categories')
      .insert({ household_id: household.id, name: newName.trim(), icon: newIcon, sort_order: nextOrder })
      .select()
      .single();
    if (data) setCategories((prev) => [...prev, data]);
    setNewName('');
    setNewIcon('other');
    setCreating(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <AdminHeader title="Catégories" tab="categories" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {creating ? (
          <View style={styles.createCard}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom de la catégorie"
              placeholderTextColor={colors.textFaint}
              style={styles.createInput}
              autoFocus
            />
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={[styles.iconOption, newIcon === icon && styles.iconOptionActive]}
                  onPress={() => setNewIcon(icon)}
                >
                  <CategoryIcon icon={icon} size={18} />
                </Pressable>
              ))}
            </View>
            <View style={styles.createActions}>
              <Pressable style={styles.createCancel} onPress={() => setCreating(false)}>
                <Text style={styles.createCancelLabel}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.createConfirm} onPress={createCategory}>
                <Text style={styles.createConfirmLabel}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => setCreating(true)}>
            <PlusIcon color={colors.accent} />
            <Text style={styles.addButtonLabel}>Ajouter une catégorie</Text>
          </Pressable>
        )}

        <Text style={styles.hint}>Utilisez les flèches pour réordonner les catégories.</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
        ) : (
          <View style={styles.card}>
            {categories.map((cat, index) => (
              <View key={cat.id} style={[styles.row, index === categories.length - 1 && styles.rowLast, !cat.active && styles.rowInactive]}>
                <View style={styles.arrows}>
                  <Pressable onPress={() => move(index, -1)} disabled={index === 0} hitSlop={6}>
                    <ArrowIcon direction="up" color={index === 0 ? colors.textFaint : colors.textSoft} />
                  </Pressable>
                  <Pressable onPress={() => move(index, 1)} disabled={index === categories.length - 1} hitSlop={6}>
                    <ArrowIcon direction="down" color={index === categories.length - 1 ? colors.textFaint : colors.textSoft} />
                  </Pressable>
                </View>
                <View style={styles.iconTile}>
                  <CategoryIcon icon={cat.icon} size={18} />
                </View>
                {editingId === cat.id ? (
                  <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    style={styles.editInput}
                    autoFocus
                    onSubmitEditing={saveEdit}
                    onBlur={saveEdit}
                    returnKeyType="done"
                  />
                ) : (
                  <Pressable style={{ flex: 1 }} onPress={() => startEdit(cat)}>
                    <Text style={styles.rowTitle}>{cat.name}</Text>
                    <Text style={styles.rowMeta}>
                      {counts[cat.id] ?? 0} produit{(counts[cat.id] ?? 0) > 1 ? 's' : ''}
                      {!cat.active ? ' · désactivée' : ''}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.miniSwitchTrack, cat.active && styles.miniSwitchTrackOn]}
                  onPress={() => toggleActive(cat)}
                >
                  <View style={[styles.miniSwitchKnob, cat.active && styles.miniSwitchKnobOn]} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(cat)} hitSlop={8}>
                  <Text style={styles.deleteLabel}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 20,
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  addButtonLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },
  createCard: { marginHorizontal: 20, marginTop: 18, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  createInput: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  iconOption: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  iconOptionActive: { backgroundColor: '#FCF1E9', borderWidth: 1.5, borderColor: colors.accent },
  createActions: { flexDirection: 'row', gap: 10 },
  createCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border },
  createCancelLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.textSoft },
  createConfirm: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radii.md, backgroundColor: colors.accent },
  createConfirmLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginHorizontal: 20, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1E7D8' },
  rowLast: { borderBottomWidth: 0 },
  rowInactive: { opacity: 0.5 },
  arrows: { gap: 2 },
  iconTile: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft, marginTop: 1 },
  editInput: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniSwitchTrack: { width: 36, height: 22, borderRadius: 11, backgroundColor: colors.borderStrong, padding: 3 },
  miniSwitchTrackOn: { backgroundColor: colors.accent },
  miniSwitchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  miniSwitchKnobOn: { alignSelf: 'flex-end' },
  deleteLabel: { fontFamily: fonts.display, fontSize: 20, color: colors.textFaint, paddingHorizontal: 2 },
});
