import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

export default function Mentions() {
  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'32px'}}>Mentions légales</h1>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Éditeur du site</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            <strong>SteFi Services</strong><br/>
            Port-au-Prince, Haïti<br/>
            Email : stefi3274@gmail.com<br/>
            Téléphone : +509 55108873
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Directeur de la publication</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Stevenson Mervil, responsable de SteFi Services.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Hébergement</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Le site MakeGoal est hébergé par <strong>Vercel Inc.</strong><br/>
            340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br/>
            Site : vercel.com
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Propriété intellectuelle</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            L&apos;ensemble du contenu du site MakeGoal (textes, visuels, code, logos) est la propriété exclusive de SteFi Services, sauf mention contraire. Toute reproduction, totale ou partielle, sans autorisation écrite préalable est interdite.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Données fournies par des tiers</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Les données sportives (matchs, équipes, calendriers) affichées sur MakeGoal proviennent de fournisseurs tiers. SteFi Services ne garantit pas leur exactitude absolue ni leur disponibilité permanente.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Responsabilité</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            MakeGoal est un média sportif qui publie des informations, analyses et contenus communautaires à titre informatif. SteFi Services met tout en œuvre pour la qualité de ses contenus mais ne peut garantir leur exactitude absolue. Les votes et pronostics de la communauté reflètent les opinions des membres et n&apos;engagent pas la responsabilité de l&apos;éditeur.
          </p>
        </section>

        <section>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Contact</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Pour toute question, demande commerciale ou signalement, contactez-nous à <strong>stefi3274@gmail.com</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}