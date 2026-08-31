import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../../lib/AuthProvider';
import { colors, fonts, radii } from '../../../lib/theme';
import { ChevronRightIcon } from '../../../components/CategoryIcon';

export default function PlusScreen() {
  const insets = useSafeAreaInsets();
  const { household, member, profile, isAdmin, signOut } = useAuth();

  const roleLabel = member?.role === 'admin' ? 'Administrateur' : member?.role === 'responsable' ? 'Responsable du foyer' : 'Personnel de maison';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Plus</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Foyer</Text>
          <Text style={styles.value}>{household?.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Code du foyer</Text>
          <Text style={styles.value}>{household?.code}</Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.label}>Vous</Text>
          <Text style={styles.value}>{profile?.name} · {roleLabel}</Text>
        </View>
      </View>

      {isAdmin ? (
        <>
          <Pressable style={styles.linkCard} onPress={() => router.push('/admin/utilisateurs')}>
            <Text style={styles.linkLabel}>Utilisateurs du foyer</Text>
            <ChevronRightIcon />
          </Pressable>
          <Pressable style={styles.linkCard} onPress={() => router.push('/admin/catalogue')}>
            <Text style={styles.linkLabel}>Catalogue et catégories</Text>
            <ChevronRightIcon />
          </Pressable>
        </>
      ) : null}

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutLabel}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E7D8',
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSoft },
  value: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: colors.text },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  linkLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  signOut: { marginHorizontal: 20, marginTop: 24, alignItems: 'center' },
  signOutLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#C23B3B' },
});
