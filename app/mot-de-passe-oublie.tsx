import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { BackIcon } from '../components/CategoryIcon';

// resetPasswordForEmail() ne révèle jamais si l'adresse existe (Supabase le
// garantit côté serveur) : le message affiché est TOUJOURS le même,
// indépendamment du résultat réel, pour ne pas permettre l'énumération de
// comptes.
export default function MotDePasseOublieScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError('Renseignez votre adresse email.');
      return;
    }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    console.log('[auth] password_reset_requested');
    setSent(true);
  }

  if (sent) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.title}>Vérifiez votre email</Text>
        <Text style={styles.body}>
          Si un compte existe avec cette adresse, un code de réinitialisation vous sera envoyé.
        </Text>
        <PrimaryButton
          label="J'ai reçu le code"
          onPress={() => router.replace({ pathname: '/reinitialiser-mot-de-passe', params: { email: email.trim() } })}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <BackIcon size={20} />
        </Pressable>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>Nous vous enverrons un code de réinitialisation.</Text>

        <FormField
          label="Adresse email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Envoyer le code" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 18, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, marginTop: 4, marginBottom: 24, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, lineHeight: 22, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
});
