export type CouleursClub = { primaire: string; secondaire: string; sombre: boolean };

// "sombre: true" = fond clair (blanc/jaune...), on bascule sur un fond sombre
// alternatif pour garder le texte blanc lisible.
const CLUBS: Record<string, CouleursClub> = {
  'real madrid': { primaire: '#1a1a2e', secondaire: '#febe10', sombre: false },
  'barcelone': { primaire: '#a50044', secondaire: '#004d98', sombre: false },
  'barcelona': { primaire: '#a50044', secondaire: '#004d98', sombre: false },
  'fc barcelone': { primaire: '#a50044', secondaire: '#004d98', sombre: false },
  'atletico madrid': { primaire: '#ce3524', secondaire: '#1b1b1b', sombre: false },
  'atlético madrid': { primaire: '#ce3524', secondaire: '#1b1b1b', sombre: false },
  'bayern munich': { primaire: '#dc052d', secondaire: '#0066b2', sombre: false },
  'bayern': { primaire: '#dc052d', secondaire: '#0066b2', sombre: false },
  'borussia dortmund': { primaire: '#1a1a1a', secondaire: '#fde100', sombre: false },
  'dortmund': { primaire: '#1a1a1a', secondaire: '#fde100', sombre: false },
  'psg': { primaire: '#004170', secondaire: '#da291c', sombre: false },
  'paris saint-germain': { primaire: '#004170', secondaire: '#da291c', sombre: false },
  'manchester city': { primaire: '#1c2c5b', secondaire: '#6cabdd', sombre: false },
  'manchester united': { primaire: '#da291c', secondaire: '#fbe122', sombre: false },
  'liverpool': { primaire: '#c8102e', secondaire: '#00b2a9', sombre: false },
  'arsenal': { primaire: '#ef0107', secondaire: '#063672', sombre: false },
  'chelsea': { primaire: '#034694', secondaire: '#ffffff', sombre: false },
  'tottenham': { primaire: '#132257', secondaire: '#ffffff', sombre: false },
  'inter milan': { primaire: '#0068a8', secondaire: '#1a1a1a', sombre: false },
  'inter': { primaire: '#0068a8', secondaire: '#1a1a1a', sombre: false },
  'ac milan': { primaire: '#fb090b', secondaire: '#1a1a1a', sombre: false },
  'milan': { primaire: '#fb090b', secondaire: '#1a1a1a', sombre: false },
  'juventus': { primaire: '#1a1a1a', secondaire: '#ffffff', sombre: false },
  'napoli': { primaire: '#12a0d7', secondaire: '#ffffff', sombre: false },
  'roma': { primaire: '#8e1f2f', secondaire: '#f0bc42', sombre: false },
  'as roma': { primaire: '#8e1f2f', secondaire: '#f0bc42', sombre: false },
  'fc porto': { primaire: '#00447c', secondaire: '#ffffff', sombre: false },
  'porto': { primaire: '#00447c', secondaire: '#ffffff', sombre: false },
  'sporting cp': { primaire: '#008542', secondaire: '#ffffff', sombre: false },
  'benfica': { primaire: '#e2231a', secondaire: '#1a1a1a', sombre: false },
  'monaco': { primaire: '#e5202e', secondaire: '#1a1a2e', sombre: false },
  'marseille': { primaire: '#2fa8e0', secondaire: '#ffffff', sombre: false },
  'lyon': { primaire: '#1a1a2e', secondaire: '#da291c', sombre: false },
};

export function couleursClub(nomEquipe: string): CouleursClub {
  const cle = nomEquipe.trim().toLowerCase();
  return CLUBS[cle] || { primaire: '#4b0e8f', secondaire: '#bf00ff', sombre: false };
}
