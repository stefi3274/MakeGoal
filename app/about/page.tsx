import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

export default function About() {
  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>À propos de MakeGoal</h1>
        <p style={{color:'#6b7280',fontSize:'16px',marginBottom:'32px'}}>Plateforme de pronostics pour parieurs intelligents.</p>

        <section style={{marginBottom:'32px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'12px'}}>Notre mission</h2>
          <p style={{lineHeight:'1.7',fontSize:'16px',color:'#374151'}}>
            MakeGoal a une seule ambition : aider les joueurs à jouer intelligemment. Trop de parieurs misent à l&apos;aveugle, sans information ni recul. Nous croyons qu&apos;un pari devrait être une décision éclairée, jamais un coup de tête.
          </p>
        </section>

        <section style={{marginBottom:'32px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'12px'}}>Ce que nous proposons</h2>
          <p style={{lineHeight:'1.7',fontSize:'16px',color:'#374151'}}>
            Sur MakeGoal, vous trouvez les calendriers des grandes ligues, des analyses de matchs, des pronostics raisonnés et bientôt des outils statistiques pour affiner vos choix. Notre approche est simple : donner aux parieurs francophones, en particulier en Haïti et dans la Caraïbe, des informations claires et accessibles.
          </p>
        </section>

        <section style={{marginBottom:'32px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'12px'}}>Qui est derrière le projet</h2>
          <p style={{lineHeight:'1.7',fontSize:'16px',color:'#374151'}}>
            MakeGoal est édité par <strong>SteFi Services</strong>, une structure haïtienne basée à Port-au-Prince. SteFi Services développe des projets numériques au service du public francophone et caribéen.
          </p>
        </section>

        <section style={{background:'#f9fafb',padding:'20px',borderRadius:'12px',borderLeft:'4px solid ' + VIOLET}}>
          <h2 style={{fontWeight:900,fontSize:'18px',marginBottom:'8px',color:VIOLET}}>Notre engagement</h2>
          <p style={{lineHeight:'1.6',fontSize:'14px',color:'#374151',margin:0}}>
            Nous ne sommes pas un opérateur de paris. Nous sommes une plateforme d&apos;information et de pronostics. Nous encourageons toujours le jeu responsable et rappelons que les paris doivent rester un loisir, jamais une source de revenus.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
