import { Tabs } from 'expo-router';
import { colors, fonts } from '../../lib/theme';
import { CartTabIcon, HistoryTabIcon, MoreTabIcon } from '../../components/TabIcons';

export default function BuyerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{ title: 'Courses', tabBarIcon: ({ color }) => <CartTabIcon color={String(color)} /> }}
      />
      <Tabs.Screen
        name="historique"
        options={{ title: 'Historique', tabBarIcon: ({ color }) => <HistoryTabIcon color={String(color)} /> }}
      />
      <Tabs.Screen
        name="plus"
        options={{ title: 'Plus', tabBarIcon: ({ color }) => <MoreTabIcon color={String(color)} /> }}
      />
    </Tabs>
  );
}
