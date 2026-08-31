import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts, radii } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

const MIN_PASSWORD_LENGTH = 8;

// Deux étapes locales dans un seul écran : d'abord le code reçu par email
// (verifyOtp type "recovery"), puis — une fois le code validé et la session
// ouverte — le nouveau mot de passe. Toujours vérifié côté Supabase, jamais
// comparé en front.
export default function ReinitialiserMotDePasseScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verifyCode(value: string) {
    setError(null);
    if (value.length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: String(email ?? ''),
      token: value,
      type: 'recovery',
    });
    setLoading(false);
    if (verifyError) {
      console.log('[auth] password_reset_otp_failed');
      setError('Code incorrect ou expiré.');
      setCode('');
      return;
    }
    console.log('[auth] password_reset_otp_verified');
    setStep('password');
  }

  async function submitNewPassword() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("Impossible d'enregistrer le mot de passe. Réessayez.");
      return;
    }
    console.log('[auth] password_reset_completed');
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (step === 'password') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Nouveau mot de passe</Text>

          <FormField
            label="Nouveau mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={`•••••••• (${MIN_PASSWORD_LENGTH} caractères min.)`}
          />
          <FormField
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Enregistrer" onPress={submitNewPassword} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Vérifiez votre email</Text>
        <Text style={styles.body}>
          Entrez le code à 6 chiffres reçu à{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <TextInput
          value={code}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            if (digits.length === 6) verifyCode(digits);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          placeholder="______"
          placeholderTextColor={colors.textFaint}
          style={styles.otpInput}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Valider" onPress={() => verifyCode(code)} loading={loading} />

        <Pressable onPress={() => router.replace({ pathname: '/mot-de-passe-oublie', params: { email } })} hitSlop={8} style={{ marginTop: 20 }}>
          <Text style={styles.link}>Renvoyer le code</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginBottom: 12, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, lineHeight: 22, marginBottom: 28, textAlign: 'center' },
  email: { fontFamily: fonts.bodyBold, color: colors.text },
  otpInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 16,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: 10,
    color: colors.text,
    marginBottom: 18,
  },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12, textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent, textAlign: 'center' },
});
