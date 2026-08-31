import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { randomPlaceholderPassword } from '../lib/randomSecret';
import { colors, fonts } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { BackIcon } from '../components/CategoryIcon';

// Inscription réduite au strict minimum : nom + email. Le mot de passe est
// choisi APRÈS validation de l'OTP (voir creer-mot-de-passe.tsx) — signUp()
// exige techniquement une valeur, on lui passe un provisoire aléatoire que
// l'utilisateur ne voit jamais et qui est remplacé avant d'avoir pu servir.
export default function CreerCompteScreen() {
  const { beginEmailVerification } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Merci de remplir tous les champs.');
      return;
    }

    setLoading(true);
    console.log('[auth] signup_initiated');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: randomPlaceholderPassword(),
      options: { data: { name: name.trim() } },
    });
    setLoading(false);

    if (signUpError) {
      setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
      return;
    }

    // Signal documenté Supabase : identities vide = email déjà associé à un
    // compte confirmé. Aucun email n'a été envoyé dans ce cas — ne jamais
    // afficher l'écran OTP comme si un code venait de partir.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.log('[auth] signup_existing_account');
      setExistingAccountEmail(email.trim());
      return;
    }

    // Nouveau compte, ou compte existant non confirmé (reprise du parcours
    // sans doublon) : un OTP réel vient d'être envoyé dans les deux cas.
    beginEmailVerification(email.trim());
    router.replace('/verifier-otp');
  }

  if (existingAccountEmail) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Compte déjà existant</Text>
        <Text style={styles.subtitle}>Un compte existe déjà avec cette adresse email.</Text>
        <PrimaryButton
          label="Se connecter"
          onPress={() => router.replace({ pathname: '/login', params: { email: existingAccountEmail } })}
        />
        <PrimaryButton
          label="Mot de passe oublié"
          variant="outline"
          onPress={() => router.push({ pathname: '/mot-de-passe-oublie', params: { email: existingAccountEmail } })}
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
        <Text style={styles.title}>Créer mon compte</Text>
        <Text style={styles.subtitle}>Vous choisirez votre mot de passe juste après.</Text>

        <FormField label="Nom" value={name} onChangeText={setName} placeholder="Adil Amrani" />
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Continuer" onPress={submit} loading={loading} />
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
