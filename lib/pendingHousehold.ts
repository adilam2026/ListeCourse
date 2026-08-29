import AsyncStorage from '@react-native-async-storage/async-storage';

// Quand l'inscription admin exige une confirmation par email, la session
// n'existe pas encore juste après signUp() : on ne peut donc pas encore
// appeler create_household(). On mémorise le nom du foyer à créer, et
// AuthProvider le consomme dès qu'une session apparaît sans foyer associé
// (typiquement : l'utilisateur revient après avoir confirmé son email).
const KEY = 'listecourse.pending_household';

interface PendingHousehold {
  displayName: string;
  householdName: string;
}

export async function setPendingHousehold(data: PendingHousehold): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // best-effort
  }
}

export async function consumePendingHousehold(): Promise<PendingHousehold | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingHousehold;
  } catch {
    return null;
  }
}
