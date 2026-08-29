import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

export default function ConfirmezEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tryLogin() {
    setError(null);
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
    router.replace('/');
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="J'ai confirmé, me connecter" onPress={tryLogin} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginBottom: 12 },
  body: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, lineHeight: 22, marginBottom: 28 },
  email: { fontFamily: fonts.bodyBold, color: colors.text },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
});
