'use client';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const VIOLET = '#bf00ff';

export default function TermesConcours() {
  const section = { marginBottom: '28px' };
  const titre = { fontWeight: 900 as const, fontSize: '18px', marginBottom: '10px', color: '#111' };
  const texte = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>

        <a href="/concours" style={{color:VIOLET,fontSize:'14px',textDecoration:'none',fontWeight:600,display:'inline-block',marginBottom:'24px'}}>
          ← Retour au concours
        </a>

        <h1 style={{fontWeight:900,fontSize:'32px',marginBottom:'8px'}}>Termes et Conditions</h1>
        <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'32px'}}>Concours MakeGoal — Règlement officiel</p>

        <div style={section}>
          <h2 style={titre}>1. Organisateur</h2>
          <p style={texte}>Le concours MakeGoal est organisé par SteFi Services. En participant, vous acceptez l&apos;intégralité du présent règlement.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>2. Conditions de participation</h2>
          <p style={texte}>La participation est gratuite et réservée aux personnes âgées de 18 ans ou plus. Un compte MakeGoal valide est obligatoire. Chaque personne ne peut détenir qu&apos;un seul compte. Les comptes multiples entraînent la disqualification.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>3. Comment gagner des points</h2>
          <p style={texte}>Les points sont attribués comme suit :</p>
          <p style={texte}>• Voter le résultat du match (1, X ou 2) : <strong>10 points</strong></p>
          <p style={texte}>• Deviner le score exact : <strong>20 points</strong></p>
          <p style={texte}>• Voter un buteur correct : <strong>10 points par buteur</strong></p>
          <p style={texte}>• Buteur exact (bonus) : <strong>25 points</strong></p>
          <p style={texte}>• Chaque personne inscrite via votre lien de parrainage : <strong>15 points</strong></p>
        </div>

        <div style={section}>
          <h2 style={titre}>4. Tirage au sort</h2>
          <p style={texte}>À l&apos;issue du match, les points de chaque participant sont calculés. Le tirage au sort des gagnants se fait de manière aléatoire parmi les 100 participants ayant obtenu le plus de points. La décision de l&apos;organisateur est finale.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>5. Lots</h2>
          <p style={texte}>Les lots mis en jeu comprennent : 10 000 Gourdes, des tablettes, et des abonnements Netflix de 3 mois. Les lots ne sont ni échangeables ni convertibles, sauf mention contraire.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>6. Annonce et remise des lots</h2>
          <p style={texte}>Les gagnants seront contactés via l&apos;email associé à leur compte MakeGoal. Un gagnant qui ne réclame pas son lot dans un délai de 15 jours perd le bénéfice de son gain, qui pourra être réattribué.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>7. Règles anti-fraude</h2>
          <p style={texte}>Toute tentative de fraude (comptes multiples, faux parrainages, manipulation) entraîne la disqualification immédiate et définitive. MakeGoal se réserve le droit de vérifier l&apos;authenticité des participations.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>8. Jeu responsable</h2>
          <p style={texte}>MakeGoal promeut une approche ludique et responsable. Ce concours est un jeu de pronostics gratuit, sans mise d&apos;argent de la part des participants. 18+ uniquement.</p>
        </div><div style={section}>
          <h2 style={titre}>9. Contact</h2>
          <p style={texte}>Pour toute question relative au concours : stefi3274@gmail.com</p>
        </div>

        <div style={{background:'#faf5ff',border:'1px solid '+VIOLET,borderRadius:'12px',padding:'16px',marginTop:'32px'}}>
          <p style={{color:'#374151',fontSize:'13px',margin:0,lineHeight:'1.6'}}>
            En participant au concours MakeGoal, vous reconnaissez avoir lu, compris et accepté l&apos;ensemble de ce règlement.
          </p>
        </div>

      </main>
      <Footer />
    </div>
  );
}