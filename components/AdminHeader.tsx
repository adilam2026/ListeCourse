import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../lib/theme';
import { BackIcon } from './CategoryIcon';

type AdminTab = 'utilisateurs' | 'produits' | 'categories';

const TABS: { key: AdminTab; label: string; href: '/admin/utilisateurs' | '/admin/catalogue' | '/admin/categories' }[] = [
  { key: 'utilisateurs', label: 'Utilisateurs', href: '/admin/utilisateurs' },
  { key: 'produits', label: 'Produits', href: '/admin/catalogue' },
  { key: 'categories', label: 'Catégories', href: '/admin/categories' },
];

export function AdminHeader({ title, tab }: { title: string; tab: AdminTab }) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
        <BackIcon size={16} />
        <Text style={styles.backLabel}>Administration</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => router.replace(t.href)}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  backLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textSoft },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radii.md, padding: 4 },
  tab: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 9 },
  tabActive: { backgroundColor: colors.surface },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.textSoft },
  tabLabelActive: { color: colors.text },
});
