import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { BackIcon } from '../components/CategoryIcon';

// Pour l'administrateur (compte email) qui se reconnecte après une
// déconnexion, un changement d'appareil, ou une session expirée — le seul
// autre chemin de connexion ("J'ai déjà un accès") est réservé aux comptes
// secondaires (identifiant/mot de passe), qui n'ont pas d'email.
export default function ConnexionEmailScreen() {
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
      console.log('[auth] admin_login_failed');
      setError('Email ou mot de passe incorrect.');
      return;
    }
    console.log('[auth] admin_login_succeeded');
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
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <BackIcon size={20} />
        </Pressable>
        <Text style={styles.title}>Se connecter (administrateur)</Text>
        <Text style={styles.subtitle}>Avec l'email utilisé à la création de votre foyer.</Text>

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

        <Pressable onPress={forgotPassword} hitSlop={8}>
          <Text style={styles.forgot}>Mot de passe oublié ?</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 18 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, marginTop: 4, marginBottom: 24 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
  forgot: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent, textAlign: 'center', marginTop: 18 },
});
