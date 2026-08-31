import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';

const MIN_PASSWORD_LENGTH = 8;

// Atteint uniquement via le statut global "signup_password_pending" : une
// session existe déjà (OTP validé), mais avec le mot de passe provisoire
// généré côté client au signUp() — jamais montré, jamais utilisable en
// pratique puisqu'on le remplace ici avant que l'utilisateur ne quitte cet
// écran. Une fois fait, on déconnecte volontairement et on renvoie vers
// Login : pas d'entrée directe dans l'application depuis l'inscription.
export default function CreerMotDePasseScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
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
    const { data: userData, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError || !userData.user) {
      setLoading(false);
      setError("Impossible d'enregistrer le mot de passe. Réessayez.");
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ password_set: true })
      .eq('id', userData.user.id);
    setLoading(false);

    if (profileError) {
      setError("Impossible de finaliser l'inscription. Réessayez.");
      return;
    }

    console.log('[auth] password_created');
    await supabase.auth.signOut();
    setDone(true);
  }

  if (done) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.title}>Votre compte est créé.</Text>
        <PrimaryButton label="Se connecter" onPress={() => router.replace('/login')} style={{ marginTop: 20 }} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Créez votre mot de passe</Text>
        <Text style={styles.subtitle}>Dernière étape avant d'accéder à votre compte.</Text>

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

        <PrimaryButton label="Enregistrer" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, marginTop: 8, marginBottom: 24, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
});
