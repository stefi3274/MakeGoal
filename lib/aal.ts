// Double authentification : le jeton Supabase (déjà vérifié par getUser) porte le niveau « aal2 »
// uniquement si le code de l'application Authenticator a été validé pour cette session.
export function aalDuJeton(jeton: string): string {
  try { return JSON.parse(Buffer.from(jeton.split('.')[1], 'base64url').toString('utf8')).aal || ''; } catch { return ''; }
}

// Renvoie une réponse 401 si la double authentification n'est pas validée, sinon null.
export function exigerAal2(jeton: string): Response | null {
  return aalDuJeton(jeton) === 'aal2' ? null : Response.json({ error: 'Double authentification requise.' }, { status: 401 });
}
