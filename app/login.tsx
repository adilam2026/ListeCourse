import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getRememberedInviteCode } from '../lib/deviceHousehold';
import { colors, fonts } from '../lib/theme';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginChooserScreen() {
  const [rememberedCode, setRememberedCode] = useState<string | null>(null);

  useEffect(() => {
    getRememberedInviteCode().then(setRememberedCode);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>ListeCourse</Text>
      <Text style={styles.title}>Se connecter</Text>
      <Text style={styles.subtitle}>
        La liste de courses partagée de votre foyer, synchronisée en temps réel.
      </Text>

      <View style={styles.actions}>
        <PrimaryButton
          label="J'ai déjà un accès"
          onPress={() => router.push('/acces-existant')}
        />
        {rememberedCode ? (
          <Text style={styles.hint}>Foyer mémorisé sur cet appareil : {rememberedCode}</Text>
        ) : null}

        <PrimaryButton
          label="Créer un nouveau foyer"
          variant="outline"
          onPress={() => router.push('/creer-foyer')}
          style={{ marginTop: 22 }}
        />
        <Text style={styles.hint}>
          À réserver à la première personne qui met en place le foyer — les autres membres
          utilisent l'accès que cette personne leur crée.
        </Text>

        <Pressable onPress={() => router.push('/connexion-email')} hitSlop={8} style={{ marginTop: 26, alignSelf: 'center' }}>
          <Text style={styles.adminLoginLink}>Déjà administrateur d'un foyer ? Se connecter avec votre email</Text>
        </Pressable>
      </View>
    </ScrollView>
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
    fontSize: 28,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.textSoft,
    marginTop: 6,
    lineHeight: 21,
  },
  actions: {
    marginTop: 36,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textSoft,
    marginTop: 10,
    lineHeight: 18,
  },
  adminLoginLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.accent,
    textAlign: 'center',
  },
});
