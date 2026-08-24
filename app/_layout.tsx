import { useFonts, Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import {
  NunitoSans_400Regular,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from '../lib/AuthProvider';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    NunitoSans_400Regular,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.configScreen}>
        <Text style={styles.configTitle}>Configuration manquante</Text>
        <Text style={styles.configBody}>
          Créez un fichier .env à la racine du projet (voir .env.example) avec les clés
          EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY de votre projet Supabase,
          puis relancez `npx expo start`. Voir SETUP.md pour le détail des étapes.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  configTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
  },
  configBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSoft,
  },
});
