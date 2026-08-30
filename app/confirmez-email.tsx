import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

// Supabase n'ouvre pas de session automatiquement quand le lien de
// confirmation est cliqué dans un navigateur externe (pas de deep-link
// configuré) : l'utilisateur doit revenir dans l'app et se connecter une
// fois son email confirmé. Tant que ce n'est pas fait, signInWithPassword
// échoue explicitement (Confirm email = ON côté projet).
export default function ConfirmezEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function tryLogin() {
    setError(null);
    setNotice(null);
    if (!password) {
      setError('Renseignez votre mot de passe.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(email ?? ''),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Email pas encore confirmé, ou mot de passe incorrect. Vérifiez votre boîte mail.");
      return;
    }
    // AuthProvider prend le relais : la nouvelle session déclenche
    // l'évaluation (authenticated_no_household ou ready), gérée par le
    // garde central — rien à décider ici.
    router.replace('/');
  }

  async function resend() {
    setError(null);
    setNotice(null);
    if (!email) return;
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: String(email) });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setNotice('Email de confirmation renvoyé.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Confirmez votre email</Text>
      <Text style={styles.body}>
        Un email de confirmation a été envoyé à{'\n'}
        <Text style={styles.email}>{email}</Text>.{'\n\n'}
        Ouvrez-le, confirmez votre adresse, puis revenez ici pour vous connecter.
      </Text>

      <FormField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••"
      />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="J'ai confirmé, me connecter" onPress={tryLogin} loading={loading} />
      <PrimaryButton
        label="Renvoyer l'email de confirmation"
        variant="outline"
        onPress={resend}
        loading={resending}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginBottom: 12 },
  body: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, lineHeight: 22, marginBottom: 28 },
  email: { fontFamily: fonts.bodyBold, color: colors.text },
  notice: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.success, marginBottom: 12 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
});
