import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

export default function JeuResponsable() {
  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>
        <div style={{background:VIOLET,color:'#ffffff',padding:'24px',borderRadius:'16px',marginBottom:'32px',textAlign:'center'}}>
          <h1 style={{fontWeight:900,fontSize:'32px',margin:0}}>Jouez avec modération</h1>
          <p style={{fontSize:'18px',marginTop:'8px',marginBottom:0,fontWeight:600}}>Les paris sportifs sont réservés aux personnes majeures (18+).</p>
        </div>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'12px',color:VIOLET}}>Le pari est un loisir, pas un revenu</h2>
          <p style={{lineHeight:'1.7',fontSize:'16px',color:'#374151'}}>
            MakeGoal défend une approche saine du pari sportif. Parier doit rester un plaisir occasionnel, jamais une stratégie financière, jamais une obligation, jamais une fuite. Les pertes font partie du jeu, et personne, même avec les meilleurs pronostics, ne gagne tout le temps.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'12px'}}>Nos règles simples</h2>
          <ul style={{lineHeight:'2',fontSize:'16px',color:'#374151',paddingLeft:'20px'}}>
            <li>Ne pariez jamais une somme que vous ne pouvez pas vous permettre de perdre.</li>
            <li>Fixez-vous un budget mensuel et ne le dépassez jamais.</li>
            <li>Ne jouez pas pour « vous refaire » après une perte.</li>
            <li>Ne pariez pas sous l&apos;effet de l&apos;alcool, du stress ou de la fatigue.</li>
            <li>Si le pari devient une pensée envahissante, arrêtez et demandez de l&apos;aide.</li>
          </ul>
        </section>

        <section style={{marginBottom:'28px',background:'#fef2f2',padding:'20px',borderRadius:'12px',borderLeft:'4px solid #dc2626'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px',color:'#dc2626'}}>Signes d&apos;alerte</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',marginBottom:'8px'}}>
            Si vous reconnaissez l&apos;un de ces signes, il est temps de faire une pause :
          </p>
          <ul style={{lineHeight:'1.8',fontSize:'15px',color:'#374151',paddingLeft:'20px',marginBottom:0}}>
            <li>Vous pariez plus que prévu, plus souvent que prévu.</li>
            <li>Vous cachez vos paris à votre entourage.</li>
            <li>Vous empruntez de l&apos;argent pour parier ou rembourser des pertes.</li>
            <li>Vous ressentez de l&apos;anxiété quand vous ne pariez pas.</li>
            <li>Vous négligez votre travail, votre famille ou votre santé à cause du pari.</li>
          </ul>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'12px'}}>Où trouver de l&apos;aide</h2>
          <p style={{lineHeight:'1.7',fontSize:'16px',color:'#374151'}}>
            Si vous ou un proche êtes en difficulté face au jeu, parlez-en. Un médecin, un psychologue, ou simplement une personne de confiance peuvent vous orienter. En Haïti, vous pouvez vous tourner vers les services de santé mentale de votre région ou contacter une association d&apos;aide. À l&apos;international, des lignes d&apos;écoute existent pour les francophones (par exemple Joueurs Info Service en France : 09 74 75 13 13).
          </p>
        </section>

        <section style={{textAlign:'center',padding:'24px',background:'#f9fafb',borderRadius:'12px'}}>
          <p style={{fontSize:'18px',fontWeight:900,color:VIOLET,margin:0}}>
            Jouer comporte des risques.<br/>Jouez intelligemment, jouez avec modération.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
