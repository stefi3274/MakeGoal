'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Badge = {
  id: string; href: string; emoji: string; texte: string;
  couleurDebut: string; couleurFin: string; masquerSur: string;
};

const BADGES: Badge[] = [
  { id: 'paris', href: '/paris', emoji: '🎲', texte: 'Obtenez 1 000 Gourdes et pariez !', couleurDebut: '#7c1fd9', couleurFin: '#bf00ff', masquerSur: '/paris' },
  { id: 'matchs', href: '/matchs', emoji: '🗳️', texte: 'Votez sur les matchs du jour !', couleurDebut: '#0891b2', couleurFin: '#06b6d4', masquerSur: '/matchs' }
];

export default function BadgesFlottants() {
  const pathname = usePathname();
  const badgesVisibles = BADGES.filter(b => b.masquerSur !== pathname);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (badgesVisibles.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % badgesVisibles.length), 10000);
    return () => clearInterval(t);
  }, [badgesVisibles.length]);

  if (pathname?.startsWith('/admin')) return null;
  if (badgesVisibles.length === 0) return null;

  const badge = badgesVisibles[index % badgesVisibles.length];

  return (
    <div style={{position:'fixed',top:'64px',left:0,right:0,zIndex:40,display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',pointerEvents:'none',padding:'0 16px'}}>
      <style>{`
        @keyframes badgeEntree { 0% { opacity:0; transform:translateY(-6px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes badgeLueur { 0%,100% { box-shadow:0 4px 20px rgba(0,0,0,0.22); } 50% { box-shadow:0 4px 30px rgba(0,0,0,0.35); } }
      `}</style>
      <a key={badge.id} href={badge.href} style={{
        pointerEvents:'auto', display:'flex', alignItems:'center', gap:'10px', textDecoration:'none',
        background:'linear-gradient(135deg,'+badge.couleurDebut+','+badge.couleurFin+')', color:'#fff',
        padding:'12px 22px', borderRadius:'999px', fontWeight:900, fontSize:'14px',
        animation:'badgeEntree 0.35s ease-out, badgeLueur 2.4s ease-in-out infinite',
        maxWidth:'92vw', textAlign:'center'
      }}>
        <span style={{fontSize:'20px',flexShrink:0}}>{badge.emoji}</span>
        <span>{badge.texte}</span>
      </a>
      {badgesVisibles.length > 1 && (
        <div style={{display:'flex',gap:'6px',pointerEvents:'auto'}}>
          {badgesVisibles.map((b, i) => (
            <button key={b.id} onClick={() => setIndex(i)} aria-label={b.texte} style={{
              width: i === index ? '22px' : '8px', height:'8px', borderRadius:'999px', border:'none',
              cursor:'pointer', background: i === index ? badge.couleurFin : '#d1d5db',
              transition:'width 0.2s ease'
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}
