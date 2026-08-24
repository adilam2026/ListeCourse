import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthProvider';
import { colors } from '../lib/theme';

export default function Index() {
  const { loading, session, household, member } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (!household || !member) return <Redirect href="/onboarding" />;
  if (member.can_prepare) return <Redirect href="/preparateur" />;
  return <Redirect href="/(buyer)/courses" />;
}
