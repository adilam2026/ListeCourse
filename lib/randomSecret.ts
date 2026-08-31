// Mot de passe provisoire généré côté client au moment du signUp() — l'API
// Supabase en exige toujours un, mais le parcours cible n'en demande à
// l'utilisateur qu'après validation de l'OTP (voir creer-mot-de-passe.tsx,
// qui le remplace via updateUser() avant que quiconque n'ait pu s'en
// servir). Jamais affiché, jamais stocké, jamais réutilisé.
export function randomPlaceholderPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
