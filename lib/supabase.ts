import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Le client n'est pas typé par un schéma généré (Database) : le générateur
// `supabase gen types` a besoin d'un projet Supabase provisionné, ce que ce
// dépôt ne présume pas. Les types du domaine (voir database.types.ts) sont à
// la place appliqués explicitement sur l'état de chaque écran.
//
// En l'absence de configuration, on pointe vers une URL factice plutôt que de
// planter au chargement : les écrans vérifient `isSupabaseConfigured` et
// affichent un message clair (voir app/_layout.tsx).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
