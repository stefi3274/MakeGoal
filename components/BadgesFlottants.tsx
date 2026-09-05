import BadgeFlottant from './BadgeFlottant';

export default function BadgesFlottants() {
  return (
    <>
      <style>{`
        @keyframes rebondBadge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes lueurBadge {
          0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
          50% { box-shadow: 0 4px 32px rgba(0,0,0,0.4); }
        }
        .badge-flottant {
          position: fixed;
          bottom: 20px;
          z-index: 50;
          animation: rebondBadge 2s ease-in-out infinite;
        }
        .badge-right { right: 20px; }
        .badge-left { left: 20px; }

        /* Sur petit écran, les deux badges se chevauchaient : on les empile
           l'un au-dessus de l'autre, tous les deux à droite, plus compacts. */
        @media (max-width: 520px) {
          .badge-flottant { transform: scale(0.82); transform-origin: bottom right; }
          .badge-right { right: 10px; bottom: 78px; }
          .badge-left { left: auto; right: 10px; bottom: 10px; transform-origin: bottom right; }
        }
      `}</style>
      <BadgeFlottant
        href="/paris"
        emoji="🎲"
        texte={<>Obtenez 1 000 Gourdes<br/>et pariez !</>}
        position="right"
        couleurDebut="#7c1fd9"
        couleurFin="#bf00ff"
        masquerSur="/paris"
      />
      <BadgeFlottant
        href="/matchs"
        emoji="🗳️"
        texte={<>Votez sur les matchs<br/>du jour !</>}
        position="left"
        couleurDebut="#0891b2"
        couleurFin="#06b6d4"
        masquerSur="/matchs"
      />
    </>
  );
}
