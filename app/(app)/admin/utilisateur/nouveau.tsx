import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../lib/AuthProvider';
import { adminCreateUser } from '../../../../lib/adminUsers';
import { colors, fonts, radii } from '../../../../lib/theme';
import type { HouseholdRole } from '../../../../lib/database.types';
import FormField from '../../../../components/FormField';
import PrimaryButton from '../../../../components/PrimaryButton';
import { BackIcon } from '../../../../components/CategoryIcon';

const ROLE_OPTIONS: { key: HouseholdRole; label: string; hint: string }[] = [
  { key: 'personnel', label: 'Personnel de maison', hint: 'Prépare la liste du jour, rien de plus.' },
  { key: 'responsable', label: 'Responsable du foyer', hint: 'Fait les courses, coche les achats, clôture.' },
  { key: 'admin', label: 'Administrateur', hint: 'Accès complet, gère le foyer et les utilisateurs.' },
];

export default function NouvelUtilisateurScreen() {
  const insets = useSafeAreaInsets();
  const { household } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<HouseholdRole>('personnel');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!household?.id) return;
    if (!displayName.trim() || !username.trim() || !password) {
      setError('Merci de remplir tous les champs.');
      return;
    }

    setLoading(true);
    const result = await adminCreateUser({
      householdId: household.id,
      username: username.trim(),
      password,
      displayName: displayName.trim(),
      role,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
          <Text style={styles.headerTitle}>Ajouter un utilisateur</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <FormField label="Nom" value={displayName} onChangeText={setDisplayName} placeholder="Fatima" />
        <FormField
          label="Identifiant de connexion"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="fatima"
        />
        <FormField
          label="Mot de passe provisoire"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="•••••• (6 caractères min.)"
        />

        <Text style={styles.label}>Rôle</Text>
        {ROLE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.roleRow, role === opt.key && styles.roleRowActive]}
            onPress={() => setRole(opt.key)}
          >
            <View style={[styles.radio, role === opt.key && styles.radioActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.roleLabel}>{opt.label}</Text>
              <Text style={styles.roleHint}>{opt.hint}</Text>
            </View>
          </Pressable>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton label="Créer l'accès" onPress={submit} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12.5,
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  roleRowActive: { borderColor: colors.accent, backgroundColor: '#FCF1E9' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong },
  radioActive: { borderColor: colors.accent, borderWidth: 6 },
  roleLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  roleHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft, marginTop: 2 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginTop: 8 },
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
