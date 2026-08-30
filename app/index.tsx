import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthProvider';
import { colors, fonts } from '../lib/theme';
import PrimaryButton from '../components/PrimaryButton';

// Point d'entrée unique : ne décide jamais lui-même des règles d'accès, il
// se contente de traduire chaque état de la machine d'état centrale
// (AuthProvider) en écran. Le garde (app)/_layout.tsx applique la même
// règle pour toutes les routes protégées, quel que soit l'écran affiché.
export default function Index() {
  const { status, errorMessage, retry, resendConfirmationEmail, signOut, isPersonnel } = useAuth();

  if (status === 'bootstrapping') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status === 'signed_out') {
    return <Redirect href="/login" />;
  }

  if (status === 'needs_email_confirmation') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 19, color: colors.text, textAlign: 'center' }}>
          Confirmez votre email
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, textAlign: 'center' }}>
          Ouvrez le lien reçu par email pour activer votre compte, puis reconnectez-vous.
        </Text>
        <PrimaryButton label="Renvoyer l'email de confirmation" onPress={() => resendConfirmationEmail()} />
        <PrimaryButton label="Se déconnecter" variant="outline" onPress={signOut} />
      </View>
    );
  }

  if (status === 'needs_provisioning' || status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 19, color: colors.text, textAlign: 'center' }}>
          {status === 'needs_provisioning' ? 'Espace familial non initialisé' : 'Accès indisponible'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, textAlign: 'center' }}>
          {errorMessage ?? "Une erreur inattendue est survenue."}
        </Text>
        <PrimaryButton label="Réessayer" onPress={retry} />
        <PrimaryButton label="Se déconnecter" variant="outline" onPress={signOut} />
      </View>
    );
  }

  // status === 'ready'
  if (isPersonnel) return <Redirect href="/preparateur" />;
  return <Redirect href="/(buyer)/courses" />;
}
