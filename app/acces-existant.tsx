import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getRememberedHouseholdCode, setRememberedHouseholdCode } from '../lib/deviceHousehold';
import { colors, fonts, radii } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { BackIcon } from '../components/CategoryIcon';

export default function AccesExistantScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [rememberedCode, setRememberedCode] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRememberedHouseholdCode().then((code) => {
      if (code) {
        setRememberedCode(code);
        setInviteCode(code);
      }
    });
  }, []);

  // Message volontairement identique quel que soit le point d'échec (foyer
  // inexistant, identifiant inexistant, mot de passe incorrect) : ne jamais
  // laisser un attaquant déduire quelle partie de la combinaison est fausse.
  const GENERIC_ERROR = 'Identifiants incorrects.';

  async function submit() {
    setError(null);
    const code = inviteCode.trim();
    if (!code || !username.trim() || !password) {
      setError('Merci de remplir tous les champs.');
      return;
    }

    setLoading(true);
    const { data: email, error: resolveError } = await supabase.rpc('resolve_login_email', {
      p_invite_code: code,
      p_username: username.trim(),
    });

    if (resolveError || !email) {
      setLoading(false);
      console.log('[auth] secondary_login_failed', { reason: 'unresolved' });
      setError(GENERIC_ERROR);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      console.log('[auth] secondary_login_failed', { reason: 'bad_password' });
      setError(GENERIC_ERROR);
      return;
    }

    console.log('[auth] secondary_login_succeeded');
    await setRememberedHouseholdCode(code);
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <BackIcon size={20} />
        </Pressable>

        <Text style={styles.title}>J'ai déjà un accès</Text>
        <Text style={styles.subtitle}>Utilisez l'identifiant créé pour vous par l'administrateur du foyer.</Text>

        {rememberedCode ? (
          <View style={styles.rememberedRow}>
            <View>
              <Text style={styles.rememberedLabel}>Foyer</Text>
              <Text style={styles.rememberedValue}>{rememberedCode}</Text>
            </View>
            <Pressable
              onPress={() => {
                setRememberedCode(null);
                setInviteCode('');
              }}
            >
              <Text style={styles.changeLink}>Changer de foyer</Text>
            </Pressable>
          </View>
        ) : (
          <FormField
            label="Code du foyer"
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            placeholder="CASA-7K4M"
            autoCapitalize="characters"
          />
        )}

        <FormField
          label="Identifiant"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="fatima"
        />
        <FormField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Se connecter" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 18 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, marginTop: 4, marginBottom: 24 },
  rememberedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  rememberedLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11.5,
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rememberedValue: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text, marginTop: 2 },
  changeLink: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.accent },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
});
