import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { colors, fonts, radii } from '../lib/theme';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { BackIcon } from '../components/CategoryIcon';

// Étape volontaire et séparée de l'inscription : on est déjà connecté ici
// (voir app/index.tsx, état "authenticated_no_household"). Une seule
// information est demandée — le nom du foyer — puis create_household() fait
// tout le travail serveur (foyer + code + adhésion admin) en une opération
// atomique.
export default function CreerFoyerScreen() {
  const { retry } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError('Merci de renseigner le nom de votre foyer.');
      return;
    }
    setLoading(true);
    const { data, error: createError } = await supabase.rpc('create_household', { p_name: name.trim() });
    setLoading(false);
    if (createError || !data?.length) {
      setError(
        createError?.message === 'already_has_household'
          ? 'Vous appartenez déjà à un foyer.'
          : "Impossible de créer le foyer pour l'instant."
      );
      return;
    }
    setCreatedCode(data[0].household_code);
  }

  async function continueToApp() {
    // create_household() ne change pas la session : on force AuthProvider à
    // relire l'adhésion qui vient d'être créée avant de continuer.
    await retry();
    router.replace('/');
  }

  if (createdCode) {
    return (
      <View style={styles.confirmContainer}>
        <Text style={styles.confirmTitle}>Foyer {name.trim()} créé ✓</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Code foyer</Text>
          <Text style={styles.codeValue}>{createdCode}</Text>
        </View>
        <Text style={styles.confirmHint}>
          Ce code servira à connecter les utilisateurs secondaires de votre foyer.
        </Text>
        <PrimaryButton label="Continuer" onPress={continueToApp} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <BackIcon size={20} />
        </Pressable>
        <Text style={styles.title}>Créer mon foyer</Text>
        <Text style={styles.subtitle}>Vous devenez administrateur de ce foyer.</Text>

        <FormField label="Nom du foyer" value={name} onChangeText={setName} placeholder="Casa" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Créer" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 60 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 18 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, marginTop: 4, marginBottom: 24 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginBottom: 12 },
  confirmContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  confirmTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' },
  codeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  codeLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11.5,
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  codeValue: { fontFamily: fonts.display, fontSize: 24, color: colors.accent, marginTop: 4, letterSpacing: 1 },
  confirmHint: { fontFamily: fonts.body, fontSize: 13.5, color: colors.textSoft, textAlign: 'center', lineHeight: 20 },
});
