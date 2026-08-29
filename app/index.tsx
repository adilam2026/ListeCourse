import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthProvider';
import { colors, fonts } from '../lib/theme';
import PrimaryButton from '../components/PrimaryButton';

export default function Index() {
  const { loading, session, household, member, isPersonnel, signOut } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  if (!household || !member) {
    // Session valide mais aucun foyer rattaché : état incohérent rare
    // (ex. compte supprimé côté admin entre-temps). On ne bloque pas
    // silencieusement l'utilisateur.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 19, color: colors.text, textAlign: 'center' }}>
          Aucun foyer associé à ce compte
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, textAlign: 'center' }}>
          Votre accès a peut-être été retiré par un administrateur.
        </Text>
        <PrimaryButton label="Se déconnecter" onPress={signOut} />
      </View>
    );
  }

  if (isPersonnel) return <Redirect href="/preparateur" />;
  return <Redirect href="/(buyer)/courses" />;
}
