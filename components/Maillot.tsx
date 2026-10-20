import { texteSur } from '../lib/fantasyProfil';

// Pastille « maillot » aux couleurs de l'équipe du joueur (lettre du poste au centre).
export default function Maillot({ c1, c2, lettre, taille = 36 }: { c1?: string | null; c2?: string | null; lettre?: string; taille?: number }) {
  const fond = c1 || '#bf00ff';
  const bord = c2 || '#ffffff';
  return (
    <div style={{ width: taille, height: taille, borderRadius: '50%', background: fond, border: '3px solid ' + bord, color: texteSur(fond), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: Math.round(taille * 0.4), flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
      {lettre || ''}
    </div>
  );
}
