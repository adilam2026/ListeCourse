import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { setPendingHousehold } from '../lib/pendingHousehold';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { BackIcon } from '../components/CategoryIcon';

const MIN_PASSWORD_LENGTH = 6;

export default function CreerFoyerScreen() {
  const { refreshHousehold } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);

    if (!displayName.trim() || !email.trim() || !householdName.trim()) {
      setError('Merci de remplir tous les champs.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // Confirmation par email désactivée sur ce projet : session immédiate.
      setLoading(true);
      const { error: createError } = await supabase.rpc('create_household', {
        p_name: householdName.trim(),
        p_display_name: displayName.trim(),
      });
      setLoading(false);
      if (createError) {
        setError(createError.message);
        return;
      }
      // Le foyer vient d'être créé en base : le contexte auth (chargé au
      // moment du signUp, quand aucun foyer n'existait encore) est
      // désormais périmé. Sans ce rafraîchissement, l'écran suivant se
      // baserait sur un état "aucun foyer" obsolète.
      await refreshHousehold();
      router.replace('/');
      return;
    }

    // Confirmation par email requise : le foyer sera créé au premier login,
    // une fois la session disponible (voir AuthProvider).
    await setPendingHousehold({ displayName: displayName.trim(), householdName: householdName.trim() });
    router.replace({ pathname: '/confirmez-email', params: { email: email.trim() } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <BackIcon size={20} />
        </Pressable>
        <Text style={styles.title}>Créer un nouveau foyer</Text>
        <Text style={styles.subtitle}>Vous devenez administrateur de ce foyer.</Text>

        <FormField label="Votre prénom" value={displayName} onChangeText={setDisplayName} placeholder="Adil" />
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
          placeholder={`•••••• (${MIN_PASSWORD_LENGTH} caractères min.)`}
        />
        <FormField
          label="Confirmer le mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••"
        />
        <FormField
          label="Nom du foyer"
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="Casa"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Créer mon foyer" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 18 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, marginTop: 4, marginBottom: 24 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
});
