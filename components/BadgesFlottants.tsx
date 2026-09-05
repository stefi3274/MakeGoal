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
