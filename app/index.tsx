import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../lib/AuthProvider';
import { colors, fonts } from '../lib/theme';
import PrimaryButton from '../components/PrimaryButton';

// Point d'entrée unique : ne décide jamais lui-même des règles d'accès, il
// se contente de traduire chaque état de la machine d'état centrale
// (AuthProvider) en écran. Le garde (app)/_layout.tsx applique la même
// règle pour toutes les routes protégées, quel que soit l'écran affiché.
export default function Index() {
  const { status, profile, errorMessage, retry, signOut, isPersonnel } = useAuth();

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

  if (status === 'authenticated_no_household') {
    // Compte créé, email confirmé, aucun foyer : état normal, pas une
    // erreur. On ne crée jamais de foyer automatiquement — uniquement sur
    // un clic explicite de l'utilisateur.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' }}>
          Bonjour {profile?.first_name ?? ''} 👋
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14.5, color: colors.textSoft, textAlign: 'center', lineHeight: 21 }}>
          Votre compte est prêt. Pour commencer à utiliser ListeCourse avec votre famille, créez votre foyer.
        </Text>
        <PrimaryButton label="Créer mon foyer" onPress={() => router.push('/creer-foyer')} />
        <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.textSoft, textAlign: 'center', lineHeight: 18 }}>
          Vous pourrez ensuite ajouter les responsables du foyer et le personnel de maison.
        </Text>
        <PrimaryButton label="Se déconnecter" variant="outline" onPress={signOut} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 19, color: colors.text, textAlign: 'center' }}>
          Accès indisponible
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textSoft, textAlign: 'center' }}>
          {errorMessage ?? 'Une erreur inattendue est survenue.'}
        </Text>
        <PrimaryButton label="Réessayer" onPress={retry} />
        <PrimaryButton label="Se déconnecter" variant="outline" onPress={signOut} />
      </View>
    );
  }

  // status === 'ready'
  if (isPersonnel) return <Redirect href="/preparateur" />;
  return <Redirect href="/courses" />;
}
