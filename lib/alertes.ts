import type { SupabaseClient } from '@supabase/supabase-js';

export async function enregistrerAlerte(
  client: SupabaseClient,
  source: string,
  message: string,
  niveau: 'info' | 'erreur' = 'erreur'
) {
  await client.from('alertes_systeme').insert({ source, message, niveau });
}
