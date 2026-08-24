import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../lib/theme';
import { BackIcon } from './CategoryIcon';

export function AdminHeader({ title, tab }: { title: string; tab: 'produits' | 'categories' }) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
        <BackIcon size={16} />
        <Text style={styles.backLabel}>Administration</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'produits' && styles.tabActive]}
          onPress={() => router.replace('/admin/catalogue')}
        >
          <Text style={[styles.tabLabel, tab === 'produits' && styles.tabLabelActive]}>Produits</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'categories' && styles.tabActive]}
          onPress={() => router.replace('/admin/categories')}
        >
          <Text style={[styles.tabLabel, tab === 'categories' && styles.tabLabelActive]}>Catégories</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 6, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  backLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textSoft },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radii.md, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabActive: { backgroundColor: colors.surface },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.textSoft },
  tabLabelActive: { color: colors.text },
});
