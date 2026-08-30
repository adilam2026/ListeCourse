import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/AuthProvider';
import { colors } from '../../lib/theme';

// Garde unique pour tout l'espace applicatif protégé (Préparateur, onglets
// Acheteur, Administration). Aucun écran individuel ne décide plus seul
// s'il a le droit de s'afficher : ce layout réévalue `status` à chaque
// rendu, donc une déconnexion (ou une désactivation détectée par
// AuthProvider) fait sortir immédiatement de CET écran, quel qu'il soit —
// pas seulement au prochain passage par l'écran d'accueil.
export default function AppGroupLayout() {
  const { status } = useAuth();

  if (status === 'bootstrapping') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
