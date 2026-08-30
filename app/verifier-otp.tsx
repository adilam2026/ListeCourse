import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/AuthProvider';
import { colors, fonts, radii } from '../lib/theme';
import PrimaryButton from '../components/PrimaryButton';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifierOtpScreen() {
  const { pendingOtpEmail, verifyOtp, resendOtp, cancelEmailVerification } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Pas d'inscription en cours (ex. app relancée après avoir quitté cet
  // écran) : rien à valider ici, retour à l'accueil (le garde de route
  // s'en charge de toute façon, ceci n'est qu'un filet de sécurité local).
  useEffect(() => {
    if (!pendingOtpEmail) router.replace('/login');
  }, [pendingOtpEmail]);

  async function submit(value: string) {
    setError(null);
    setNotice(null);
    if (value.length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(value);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? 'Code incorrect ou expiré.');
      setCode('');
      return;
    }
    // AuthProvider détecte la nouvelle session et fait suivre : rien à
    // naviguer ici, app/index.tsx redirige selon le nouveau statut.
    router.replace('/');
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setResending(true);
    const result = await resendOtp();
    setResending(false);
    if (!result.ok) {
      setError(result.message ?? "Impossible de renvoyer le code.");
      return;
    }
    setNotice('Un nouveau code a été envoyé.');
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function changeEmail() {
    cancelEmailVerification();
    router.replace('/creer-compte');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Vérifiez votre email</Text>
        <Text style={styles.body}>
          Nous avons envoyé un code à 6 chiffres à{'\n'}
          <Text style={styles.email}>{pendingOtpEmail}</Text>
        </Text>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            if (digits.length === 6) submit(digits);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          placeholder="______"
          placeholderTextColor={colors.textFaint}
          style={styles.otpInput}
        />

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Valider" onPress={() => submit(code)} loading={loading} />

        <Pressable onPress={resend} disabled={cooldown > 0 || resending} hitSlop={8} style={{ marginTop: 20 }}>
          <Text style={[styles.link, (cooldown > 0 || resending) && styles.linkDisabled]}>
            {cooldown > 0 ? `Renvoyer le code dans ${cooldown} s` : 'Renvoyer le code'}
          </Text>
        </Pressable>

        <Pressable onPress={changeEmail} hitSlop={8} style={{ marginTop: 14 }}>
          <Text style={styles.link}>Changer d'adresse email</Text>
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
  notice: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.success, marginBottom: 12, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12, textAlign: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent, textAlign: 'center' },
  linkDisabled: { color: colors.textFaint },
});
