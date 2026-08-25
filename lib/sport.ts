export type Sport = 'football' | 'basketball';

export const SPORT_COULEURS: Record<Sport, { primaire: string; sombre: string; clair: string }> = {
  football: { primaire: '#bf00ff', sombre: '#7c1fd9', clair: '#faf5ff' },
  basketball: { primaire: '#ff7a00', sombre: '#c25400', clair: '#fff4ea' },
};

export const SPORT_LABEL: Record<Sport, { nom: string; emoji: string }> = {
  football: { nom: 'Football', emoji: '⚽' },
  basketball: { nom: 'Basketball', emoji: '🏀' },
};

export function getSport(): Sport {
  if (typeof window === 'undefined') return 'football';
  const s = localStorage.getItem('mg_sport');
  return s === 'basketball' ? 'basketball' : 'football';
}

export function setSport(sport: Sport) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mg_sport', sport);
  window.location.reload();
}
