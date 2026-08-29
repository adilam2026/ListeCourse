import AsyncStorage from '@react-native-async-storage/async-storage';

// Le code du foyer utilisé lors de la dernière connexion réussie sur CET
// appareil, pour éviter de le redemander à chaque ouverture (spec §6/§7).
// Ce n'est qu'un confort d'UI, pas un mécanisme de sécurité : la vraie
// protection reste la session Supabase + les policies RLS.
const KEY = 'listecourse.remembered_invite_code';

export async function getRememberedInviteCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setRememberedInviteCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code.toUpperCase());
  } catch {
    // best-effort
  }
}

export async function clearRememberedInviteCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
