import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
import { uploadProductPhoto } from '../../../lib/uploadProductPhoto';
import { colors, fonts, radii } from '../../../lib/theme';
import type { Category, Product } from '../../../lib/database.types';
import CategoryIcon, { BackIcon } from '../../../components/CategoryIcon';
import ProductPhoto from '../../../components/ProductPhoto';
import PrimaryButton from '../../../components/PrimaryButton';

export default function ProductFormScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { household } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState(false);
  const [active, setActive] = useState(true);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!household?.id) return;
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []));
  }, [household?.id]);

  useEffect(() => {
    if (isNew || !id) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProduct(data);
          setName(data.name);
          setCategoryId(data.category_id);
          setPriority(data.priority);
          setActive(data.active);
        }
        setLoading(false);
      });
  }, [id, isNew]);

  async function pickPhoto(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });

    if (!result.canceled && result.assets[0]) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  async function save() {
    if (!household?.id || !name.trim()) {
      Alert.alert('Le nom du produit est requis.');
      return;
    }
    setSaving(true);
    try {
      let productId = product?.id;
      const patch = {
        household_id: household.id,
        name: name.trim(),
        category_id: categoryId,
        priority,
        active,
      };

      if (isNew) {
        const { data, error } = await supabase.from('products').insert(patch).select().single();
        if (error) throw error;
        productId = data.id;
      } else if (productId) {
        const { error } = await supabase.from('products').update(patch).eq('id', productId);
        if (error) throw error;
      }

      if (localPhotoUri && productId) {
        const publicUrl = await uploadProductPhoto(localPhotoUri, household.id, productId);
        await supabase.from('products').update({ photo_url: publicUrl }).eq('id', productId);
      }

      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d’enregistrer le produit.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!product) return;
    Alert.alert('Supprimer ce produit ?', product.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('products').delete().eq('id', product.id);
          router.back();
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

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const photoUri = localPhotoUri ?? product?.photo_url ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
          <Text style={styles.headerTitle}>{isNew ? 'Nouveau produit' : 'Modifier le produit'}</Text>
        </Pressable>
        {!isNew ? (
          <Pressable onPress={confirmDelete} hitSlop={8}>
            <Text style={styles.deleteLabel}>Supprimer</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.photoSection}>
          <ProductPhoto uri={photoUri} size={150} radius={24} />
          <View style={styles.photoButtons}>
            <Pressable style={styles.photoButton} onPress={() => pickPhoto(true)}>
              <Text style={styles.photoButtonLabel}>Prendre une photo</Text>
            </Pressable>
            <Pressable style={styles.photoButton} onPress={() => pickPhoto(false)}>
              <Text style={styles.photoButtonLabel}>Galerie</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.fields}>
          <Text style={styles.label}>Nom du produit</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ex. Tomates" />

          <Text style={styles.label}>Catégorie</Text>
          <Pressable style={styles.selectRow} onPress={() => setShowCategoryPicker((v) => !v)}>
            <View style={styles.selectLeft}>
              {selectedCategory ? <CategoryIcon icon={selectedCategory.icon} size={16} /> : null}
              <Text style={styles.selectLabel}>{selectedCategory?.name ?? 'Choisir une catégorie'}</Text>
            </View>
          </Pressable>
          {showCategoryPicker ? (
            <View style={styles.pickerList}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    setCategoryId(c.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <CategoryIcon icon={c.icon} size={16} />
                  <Text style={styles.pickerRowLabel}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <ToggleRow
            title="Produit prioritaire"
            subtitle="Apparaît en premier dans sa catégorie"
            value={priority}
            onChange={setPriority}
          />
          <ToggleRow
            title="Produit actif"
            subtitle="Visible dans l'application"
            value={active}
            onChange={setActive}
            activeColor={colors.success}
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton label="Enregistrer" onPress={save} loading={saving} />
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  activeColor = colors.accent,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  activeColor?: string;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.switchTrack, value && { backgroundColor: activeColor }]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  deleteLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B' },
  photoSection: { alignItems: 'center', paddingTop: 22 },
  photoButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  photoButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  photoButtonLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  fields: { paddingHorizontal: 20, paddingTop: 26 },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12.5,
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    color: colors.text,
    marginBottom: 18,
  },
  selectRow: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  pickerList: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: 18,
    overflow: 'hidden',
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1E7D8' },
  pickerRowLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 12,
  },
  toggleTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  toggleSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft, marginTop: 2 },
  switchTrack: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.border, padding: 3 },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  switchKnobOn: { alignSelf: 'flex-end' },
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
  },
});
