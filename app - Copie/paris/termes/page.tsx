'use client';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const VIOLET = '#bf00ff';

export default function TermesParis() {
  const section = { marginBottom: '28px' };
  const titre = { fontWeight: 900 as const, fontSize: '18px', marginBottom: '10px', color: '#111' };
  const texte = { color: '#374151', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>

        <a href="/paris" style={{color:VIOLET,fontSize:'14px',textDecoration:'none',fontWeight:600,display:'inline-block',marginBottom:'24px'}}>
          ← Retour aux paris
        </a>

        <h1 style={{fontWeight:900,fontSize:'32px',marginBottom:'8px'}}>Termes et Conditions</h1>
        <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'32px'}}>Système de Paris MakeGoal — Règlement officiel</p>

        <div style={{background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:'12px',padding:'16px',marginBottom:'32px'}}>
          <p style={{color:'#92400e',fontSize:'14px',fontWeight:700,margin:0,lineHeight:'1.6'}}>
            🎲 Aucun achat, dépôt ou paiement n&apos;est jamais demandé pour participer. MakeGoal ne prend aucune mise en argent réel. Les Gourdes utilisées pour parier sont un solde virtuel offert par MakeGoal.
          </p>
        </div>

        <div style={section}>
          <h2 style={titre}>1. Organisateur</h2>
          <p style={texte}>Le système de Paris MakeGoal est organisé par SteFi Services. En créant un compte et en pariant, vous acceptez l&apos;intégralité du présent règlement.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>2. Conditions de participation</h2>
          <p style={texte}>La participation est gratuite, sans obligation d&apos;achat, et réservée aux personnes âgées de 18 ans ou plus. Un compte MakeGoal valide est obligatoire. Chaque personne ne peut détenir qu&apos;un seul compte ; les comptes multiples entraînent la disqualification et la perte de tout solde et de tout droit à retrait.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>3. Solde de départ</h2>
          <p style={texte}>Chaque compte reçoit <strong>1 000 Gourdes virtuelles</strong> à l&apos;inscription, utilisables uniquement pour parier sur MakeGoal. Ce solde n&apos;a aucune valeur en dehors du site et ne peut être ni acheté, ni vendu, ni transféré entre comptes. MakeGoal peut, à sa seule discrétion, octroyer des Gourdes supplémentaires à un compte (par exemple dans le cadre d&apos;une promotion).</p>
        </div>

        <div style={section}>
          <h2 style={titre}>4. Fonctionnement des paris combinés</h2>
          <p style={texte}>Seuls les paris <strong>combinés</strong> sont proposés (plusieurs sélections regroupées en un seul pari), avec un minimum de 2 sélections. La mise minimum est de 100 Gourdes. Chaque sélection porte une cote déterminée au moment du pari.</p>
          <p style={texte}>Règle de résultat d&apos;un combiné :</p>
          <p style={texte}>• Toutes les sélections correctes : le combiné est <strong>gagné</strong>, le gain (mise × cote totale) est crédité.</p>
          <p style={texte}>• Exactement une sélection incorrecte : le combiné est <strong>remboursé</strong> (la mise est restituée, sans gain ni perte).</p>
          <p style={texte}>• Deux sélections incorrectes ou plus : le combiné est <strong>perdu</strong>, la mise n&apos;est pas restituée.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>5. Mise qualifiante et objectif de retrait</h2>
          <p style={texte}>Pour pouvoir demander un retrait, un compte doit accumuler <strong>25 000 Gourdes de mises qualifiantes</strong>. Seules les mises respectant l&apos;un des paliers suivants comptent dans cet objectif :</p>
          <p style={texte}>• Sélections toutes à cote ≥ 2.00, avec une cote totale du combiné ≥ 20</p>
          <p style={texte}>• Sélections toutes à cote ≥ 1.50, avec une cote totale du combiné ≥ 50</p>
          <p style={texte}>• Sélections toutes à cote ≥ 1.20, avec une cote totale du combiné ≥ 70</p>
          <p style={texte}>Un combiné ne respectant aucun de ces paliers reste valable pour le jeu (gain, remboursement ou perte s&apos;appliquent normalement) mais ne fait pas progresser l&apos;objectif de retrait. Ces paliers peuvent être ajustés par MakeGoal ; la version en vigueur au moment du pari s&apos;applique.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>6. Retrait</h2>
          <p style={texte}>Une fois l&apos;objectif atteint, le compte peut demander <strong>un retrait unique et fixe de 1 000 Gourdes</strong>, quel que soit le solde réel du compte à ce moment. Ce retrait n&apos;est jamais automatique : il doit être demandé volontairement par l&apos;utilisateur, qui peut aussi choisir de continuer à parier avec son solde. Un seul retrait est possible par compte, à vie.</p>
          <p style={texte}>Après validation, MakeGoal s&apos;engage à traiter et verser les demandes de retrait dans un délai raisonnable. Le paiement s&apos;effectue selon les moyens disponibles en Haïti au moment de la demande.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>7. Erreurs et cotes</h2>
          <p style={texte}>Les cotes proviennent de fournisseurs tiers et peuvent, exceptionnellement, contenir des erreurs (cote manifestement erronée, décalage horaire, mauvaise identification d&apos;un match). MakeGoal se réserve le droit d&apos;annuler et de rembourser intégralement tout pari concerné par une telle erreur, y compris après résolution.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>8. Règles anti-fraude</h2>
          <p style={texte}>Toute tentative de fraude (comptes multiples, exploitation d&apos;un bug, manipulation de résultats) entraîne la disqualification immédiate et définitive, ainsi que l&apos;annulation de tout solde et de tout droit à retrait en cours. MakeGoal se réserve le droit de vérifier l&apos;authenticité de toute activité de pari.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>9. Jeu responsable</h2>
          <p style={texte}>Bien qu&apos;aucun argent réel ne soit misé par les participants, MakeGoal encourage une pratique saine et modérée. Voir notre page <a href="/jeu-responsable" style={{color:VIOLET,fontWeight:700}}>Jeu responsable</a> pour plus d&apos;informations. 18 ans et plus uniquement.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>10. Modification du règlement</h2>
          <p style={texte}>MakeGoal peut modifier ce règlement, les paliers de qualification, les cotes minimales ou le fonctionnement du système de Paris à tout moment. La version en vigueur au moment de chaque action (pari, retrait) est celle qui s&apos;applique.</p>
        </div>

        <div style={section}>
          <h2 style={titre}>11. Contact</h2>
          <p style={texte}>Pour toute question relative au système de Paris : stefi3274@gmail.com</p>
        </div>

        <div style={{background:'#faf5ff',border:'1px solid '+VIOLET,borderRadius:'12px',padding:'16px',marginTop:'32px'}}>
          <p style={{color:'#374151',fontSize:'13px',margin:0,lineHeight:'1.6'}}>
            En pariant sur MakeGoal, vous reconnaissez avoir lu, compris et accepté l&apos;ensemble de ce règlement.
          </p>
        </div>

      </main>
      <Footer />
    </div>
  );
}
