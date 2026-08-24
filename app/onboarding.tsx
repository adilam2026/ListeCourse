import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { colors, fonts, radii } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { CheckIcon } from '../components/CategoryIcon';

export default function OnboardingScreen() {
  const { refreshHousehold, signOut } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [canPrepare, setCanPrepare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!displayName.trim()) {
      setError('Merci de renseigner votre prénom.');
      return;
    }
    setLoading(true);
    const result =
      mode === 'create'
        ? await supabase.rpc('create_household', {
            p_name: householdName.trim() || 'Mon foyer',
            p_display_name: displayName.trim(),
          })
        : await supabase.rpc('join_household', {
            p_invite_code: inviteCode.trim(),
            p_display_name: displayName.trim(),
            p_can_prepare: canPrepare,
          });
    setLoading(false);
    if (result.error) {
      setError(
        result.error.message === 'invalid_invite_code'
          ? "Ce code d'invitation est introuvable."
          : result.error.message
      );
      return;
    }
    await refreshHousehold();
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bienvenue</Text>
        <Text style={styles.subtitle}>Créez le foyer, ou rejoignez celui d'un proche avec son code.</Text>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'create' && styles.tabActive]}
            onPress={() => setMode('create')}
          >
            <Text style={[styles.tabLabel, mode === 'create' && styles.tabLabelActive]}>Créer un foyer</Text>
          </Pressable>
          <Pressable style={[styles.tab, mode === 'join' && styles.tabActive]} onPress={() => setMode('join')}>
            <Text style={[styles.tabLabel, mode === 'join' && styles.tabLabelActive]}>Rejoindre</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 22 }}>
          <FormField label="Votre prénom" value={displayName} onChangeText={setDisplayName} placeholder="Adil" />

          {mode === 'create' ? (
            <FormField
              label="Nom du foyer"
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="Foyer Alami"
            />
          ) : (
            <>
              <FormField
                label="Code d'invitation"
                value={inviteCode}
                onChangeText={(t) => setInviteCode(t.toUpperCase())}
                placeholder="A1B2C3"
                autoCapitalize="characters"
              />
              <Pressable style={styles.checkboxRow} onPress={() => setCanPrepare(!canPrepare)}>
                <View style={[styles.checkbox, canPrepare && styles.checkboxChecked]}>
                  {canPrepare ? <CheckIcon size={13} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>Je prépare aussi les listes</Text>
                  <Text style={styles.checkboxHint}>
                    Sinon vous n'aurez accès qu'à l'écran des courses (cocher les produits).
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={mode === 'create' ? 'Créer le foyer' : 'Rejoindre le foyer'}
          onPress={submit}
          loading={loading}
        />

        <Text style={styles.signOut} onPress={signOut}>
          Se déconnecter
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 4,
    marginTop: 22,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  tabActive: { backgroundColor: colors.surface },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.textSoft },
  tabLabelActive: { color: colors.text },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  checkboxHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft, marginTop: 2 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
  signOut: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: 18,
  },
});
