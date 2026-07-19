import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

export default function Confidentialite() {
  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>Politique de confidentialité</h1>
        <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'32px'}}>Dernière mise à jour : juillet 2026</p>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Quelles données nous collectons</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            MakeGoal collecte uniquement les données que vous nous fournissez volontairement : votre <strong>adresse email</strong> si vous vous inscrivez à notre newsletter, et les informations de votre compte si vous en créez un (email, nom d&apos;utilisateur).
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Pourquoi nous les collectons</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Votre email sert à vous envoyer les contenus de la newsletter MakeGoal : actualités, matchs à venir, analyses. Votre compte vous permet de voter, participer aux concours et interagir avec les articles. Vos données ne sont jamais vendues ni transmises à des tiers commerciaux.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Où sont stockées vos données</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Vos données sont stockées sur les serveurs sécurisés de <strong>Supabase</strong>, notre fournisseur de base de données. L&apos;accès est protégé par des règles de sécurité strictes : seul SteFi Services peut consulter les données des membres.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Vos droits</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Vous pouvez à tout moment :
          </p>
          <ul style={{lineHeight:'1.8',fontSize:'15px',color:'#374151',paddingLeft:'20px'}}>
            <li>Demander la suppression de votre compte et de vos données</li>
            <li>Demander quelles informations nous avons sur vous</li>
            <li>Vous désinscrire de la newsletter</li>
          </ul>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Pour exercer ces droits, envoyez simplement un email à <strong>stefi3274@gmail.com</strong>. Nous répondons sous 7 jours.
          </p>
        </section>

        <section style={{marginBottom:'28px'}}>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Cookies</h2>
          <p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            MakeGoal utilise les cookies techniques strictement nécessaires au fonctionnement du site, déposés par notre hébergeur Vercel. Le site peut également, dans le cadre de partenariats ou d&apos;annonceurs, être amené à déposer des cookies de mesure d&apos;audience ou publicitaires. Le cas échéant, vous en serez informé et pourrez exprimer votre choix conformément à la réglementation applicable.
          </p>
        </section>

        <section>
          <h2 style={{fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>Modifications</h2><p style={{lineHeight:'1.7',fontSize:'15px',color:'#374151',margin:0}}>
            Cette politique peut évoluer. En cas de changement significatif, nous informerons les membres. La date de dernière mise à jour est indiquée en haut de cette page.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}