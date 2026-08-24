import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Merci de renseigner un email et un mot de passe.');
      return;
    }
    setLoading(true);
    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (authError) setError(authError.message);
    // La navigation se fait automatiquement via onAuthStateChange + app/index.tsx
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>ListeCourse</Text>
        <Text style={styles.title}>{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Retrouvez la liste de courses de votre foyer.'
            : 'Un compte par personne du foyer.'}
        </Text>

        <View style={{ marginTop: 24 }}>
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
            placeholder="••••••••"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={mode === 'signin' ? 'Se connecter' : "S'inscrire"}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 4 }}
        />

        <Text
          style={styles.switchMode}
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.textSoft,
    marginTop: 4,
  },
  error: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#C23B3B',
    marginBottom: 12,
  },
  switchMode: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.accent,
    textAlign: 'center',
    marginTop: 18,
  },
});
