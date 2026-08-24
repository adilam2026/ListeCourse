import { supabase } from './supabase';

// Convertit l'URI locale renvoyée par expo-image-picker en ArrayBuffer et
// l'envoie dans le bucket public "product-photos", sous {householdId}/{productId}.jpg
// (chemin attendu par les policies RLS de storage.objects, voir migrations SQL).
export async function uploadProductPhoto(localUri: string, householdId: string, productId: string) {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${householdId}/${productId}.jpg`;

  const { error } = await supabase.storage.from('product-photos').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  // Le cache-buster évite qu'expo-image continue d'afficher l'ancienne photo mise en cache.
  return `${data.publicUrl}?v=${Date.now()}`;
}
