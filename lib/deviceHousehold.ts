import AsyncStorage from '@react-native-async-storage/async-storage';

// Le code du foyer utilisé lors de la dernière connexion réussie sur CET
// appareil, pour éviter de le redemander à chaque ouverture. Ce n'est qu'un
// confort d'UI (pré-remplissage), jamais un mécanisme de décision
// d'authentification : la vraie source de vérité reste la session Supabase
// + les données serveur (profiles / household_members), lues par
// AuthProvider à chaque démarrage.
const KEY = 'listecourse.remembered_household_code';

export async function getRememberedHouseholdCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setRememberedHouseholdCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code.toUpperCase());
  } catch {
    // best-effort
  }
}

export async function clearRememberedHouseholdCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
