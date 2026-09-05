'use client';
import { usePathname } from 'next/navigation';

type Props = {
  href: string;
  emoji: string;
  texte: React.ReactNode;
  position: 'right' | 'left';
  couleurDebut: string;
  couleurFin: string;
  masquerSur?: string;
};

export default function BadgeFlottant({ href, emoji, texte, position, couleurDebut, couleurFin, masquerSur }: Props) {
  const pathname = usePathname();
  if (masquerSur && pathname === masquerSur) return null;

  return (
    <div className={'badge-flottant badge-' + position}>
      <a
        href={href}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
          background: 'linear-gradient(135deg,' + couleurDebut + ',' + couleurFin + ')', color: '#fff',
          padding: '14px 20px', borderRadius: '999px', fontWeight: 900, fontSize: '14px',
          animation: 'lueurBadge 2s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'
        }}
      >
        <span style={{ fontSize: '20px' }}>{emoji}</span>
        <span style={{ lineHeight: 1.2 }}>{texte}</span>
      </a>
    </div>
  );
}
