// Règles du chat global MakeGoal (partagées client et serveur).
export const EMOJIS_CHAT = ['👍', '❤️', '😂', '🔥', '👏', '😮', '😢', '⚽'];
export const MAX_CARACTERES = 300;
export const MESSAGES_AFFICHES = 60;
export const SEUIL_MASQUAGE = 3; // signalements distincts avant masquage automatique

// Nettoie un message : retire caractères de contrôle, invisibles et de direction (usurpation visuelle), compacte les espaces.
export function nettoyerMessage(brut: unknown): string {
  if (typeof brut !== 'string') return '';
  return brut
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CARACTERES);
}

// Les liens sont interdits (hameçonnage, spam). Les administrateurs sont exemptés côté serveur.
const MOTIF_LIEN = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\s?(\.|\(dot\)|\[dot\])\s?(com|net|org|io|ht|me|co|app|xyz|ly|gl|info|biz|site|shop|link|click|top|vip)\b|t\.me\/|wa\.me\/|bit\.ly)/i;
export const contientLien = (t: string) => MOTIF_LIEN.test(t);

export const ID_VALIDE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
