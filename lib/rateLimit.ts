import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Noms exacts créés par l'intégration Upstash sur Vercel avec le préfixe
// "UPSTASH_REDIS_REST" (le préfixe s'ajoute devant les noms standards de
// Vercel, il ne les remplace pas — d'où ces noms un peu longs).
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL as string,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN as string
});

// Une instance de limite par usage, chacune avec sa propre fenêtre. Le
// "prefix" isole les compteurs entre eux dans la même base Redis.
export const limiteParis = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'limite:paris-placer'
});

export const limiteConversion = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(3, '1 m'), prefix: 'limite:conversion'
});

export const limiteCotes = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'limite:cotes'
});

export const limiteQuestionEclair = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'limite:question-eclair'
});

export const limiteParrainage = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'limite:parrainage'
});

export const limiteRetrait = new Ratelimit({
  redis, limiter: Ratelimit.slidingWindow(3, '1 m'), prefix: 'limite:retrait'
});

// Petit utilitaire commun : vérifie la limite pour une clé (généralement
// l'id de l'utilisateur) et renvoie directement une réponse 429 si dépassée,
// ou null si tout va bien (à appeler juste après l'authentification).
export async function verifierLimite(limiteur: Ratelimit, cle: string): Promise<Response | null> {
  const { success, reset } = await limiteur.limit(cle);
  if (!success) {
    const secondes = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return Response.json(
      { error: 'Trop de tentatives. Réessayez dans ' + secondes + ' seconde(s).' },
      { status: 429 }
    );
  }
  return null;
}
