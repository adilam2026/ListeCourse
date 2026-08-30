import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

// Écran de connexion unique pour le compte principal (email créé à
// l'inscription). Les comptes secondaires (créés par un admin, sans email)
// passent par "J'ai un accès fourni par mon foyer" — jamais par ici.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Merci de renseigner votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      console.log('[auth] login_failed');
      setError('Email ou mot de passe incorrect.');
      return;
    }
    console.log('[auth] login_succeeded');
    router.replace('/');
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError('Renseignez votre email ci-dessus, puis appuyez à nouveau.');
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    Alert.alert('Email envoyé', 'Consultez votre boîte mail pour réinitialiser votre mot de passe.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>ListeCourse</Text>
        <Text style={styles.title}>Se connecter</Text>
        <Text style={styles.subtitle}>
          La liste de courses partagée de votre foyer, synchronisée en temps réel.
        </Text>

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
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

        <Pressable onPress={forgotPassword} hitSlop={8} style={{ marginTop: 16 }}>
          <Text style={styles.forgot}>Mot de passe oublié ?</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/creer-compte')} hitSlop={8} style={{ marginTop: 26 }}>
          <Text style={styles.linkPrimary}>Créer un compte</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/acces-existant')} hitSlop={8} style={{ marginTop: 14 }}>
          <Text style={styles.linkSecondary}>J'ai un accès fourni par mon foyer</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  brand: { fontFamily: fonts.bodyExtraBold, fontSize: 13, color: colors.accent, letterSpacing: 0.4, marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, marginTop: 6, marginBottom: 26, lineHeight: 21 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
  forgot: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent, textAlign: 'center' },
  linkPrimary: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text, textAlign: 'center' },
  linkSecondary: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.accent, textAlign: 'center' },
});
