'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

const VIOLET = '#bf00ff';

type Article = {
  id: string;
  titre: string;
  categorie: string;
  image_couverture: string | null;
  extrait: string | null;
  auteur: string;
  created_at: string;
};

type Concours = { id: string; titre: string; statut: string; lots: string | null; };

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [concours, setConcours] = useState<Concours | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tous');
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => {
    chargerArticles();
    chargerConcours();
  }, []);

  const chargerArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, titre, categorie, image_couverture, extrait, auteur, created_at')
      .eq('publie', true)
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
    setLoading(false);
  };

  const chargerConcours = async () => {
    const { data } = await supabase.from('concours').select('*').in('statut', ['ouvert','ferme']).order('created_at', { ascending: false }).limit(1).single();
    if (data) setConcours(data);
  };

  const inscrireNewsletter = async () => {
    if (!email) return;
    await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setNewsletterMsg('Merci ! Vous êtes inscrit avec succès.');
    setEmail('');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const articlesFiltres = filtre === 'Tous' ? articles : articles.filter(a => a.categorie === filtre);
  const couleurCat = (cat: string) => cat === 'Actualités' ? '#3b82f6' : '#f59e0b';

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(30px,5vw,48px)',margin:'0 0 12px'}}>
          📰 MakeGoal
        </h1>
        <p style={{color:'rgba(255,255,255,0.9)',fontSize:'18px',margin:0,fontWeight:600}}>
          Votre média football : actualités, analyses et pronostics.
        </p>
      </div>

      <main style={{maxWidth:'1000px',margin:'0 auto',padding:'40px 16px'}}>

        {concours && (
          <a href="/concours" style={{textDecoration:'none',display:'block',marginBottom:'40px'}}>
            <div style={{
              background:'linear-gradient(135deg,#3d2c00,#7a5c00,#3d2c00)',
              borderRadius:'20px', padding:'24px 28px', border:'2px solid #ffd700',
              boxShadow:'0 8px 30px rgba(255,215,0,0.25)',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:'16px', flexWrap:'wrap', cursor:'pointer'
            }}>
              <div>
                <div style={{display:'inline-block',background:'#ffd700',color:'#3d2c00',fontSize:'11px',fontWeight:900,padding:'4px 14px',borderRadius:'999px',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'1px'}}>
                  🏆 Concours en cours
                </div>
                <h2 style={{color:'#ffd700',fontWeight:900,fontSize:'22px',margin:'0 0 6px'}}>{concours.titre}</h2>
                {concours.lots && <p style={{color:'rgba(255,255,255,0.85)',fontSize:'14px',margin:0}}>🎁 {concours.lots}</p>}
              </div>
              <span style={{background:'#ffd700',color:'#3d2c00',padding:'14px 28px',borderRadius:'999px',fontWeight:900,fontSize:'15px',whiteSpace:'nowrap'}}>
                Participer →
              </span>
            </div>
          </a>
        )}

        <div style={{display:'flex',gap:'8px',marginBottom:'32px',justifyContent:'center',flexWrap:'wrap'}}>
          {['Tous', 'Actualités', 'Revue de presse'].map(cat => (
            <button key={cat} onClick={() => setFiltre(cat)} style={{
              padding:'10px 20px', borderRadius:'999px', fontWeight:700, fontSize:'14px', cursor:'pointer', border:'none',
              background: filtre === cat ? VIOLET : '#f3f4f6',
              color: filtre === cat ? '#fff' : '#374151'
            }}>
              {cat}
            </button>
          ))}
        </div>

        {loading && <p style={{color:'#9ca3af',textAlign:'center'}}>Chargement…</p>}

        {!loading && articlesFiltres.length === 0 && (
          <div style={{background:'#f9fafb',padding:'40px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Aucun article pour le moment. Revenez bientôt !</p>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'24px'}}>
          {!loading && articlesFiltres.map(a => (
            <a key={a.id} href={'/media/' + a.id} style={{textDecoration:'none',color:'inherit'}}>
              <div style={{
                border:'1px solid #e5e7eb', borderRadius:'20px', overflow:'hidden',
                boxShadow:'0 2px 12px rgba(0,0,0,0.06)', height:'100%',
                display:'flex', flexDirection:'column', cursor:'pointer'
              }}>
                {a.image_couverture ? (
                  <img src={a.image_couverture} alt={a.titre} style={{width:'100%',height:'180px',objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:'180px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'40px'}}>⚽</span>
                  </div>
                )}
                <div style={{padding:'20px',flex:1,display:'flex',flexDirection:'column'}}>
                  <span style={{display:'inline-block',alignSelf:'flex-start',fontSize:'11px',fontWeight:700,color:'#fff',background:couleurCat(a.categorie),padding:'3px 10px',borderRadius:'999px',marginBottom:'10px'}}>
                    {a.categorie}
                  </span>
                  <h2 style={{fontWeight:900,fontSize:'18px',margin:'0 0 8px',lineHeight:'1.3'}}>{a.titre}</h2>
                  {a.extrait && <p style={{color:'#6b7280',fontSize:'14px',margin:'0 0 12px',lineHeight:'1.5',flex:1}}>{a.extrait}</p>}
                  <p style={{color:'#9ca3af',fontSize:'12px',margin:0}}>{a.auteur} · {formatDate(a.created_at)}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div style={{marginTop:'48px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'8px'}}>📬 Reste connecté</h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'15px',marginBottom:'20px'}}>
            Reçois les dernières actus et les concours MakeGoal.
          </p>
          {newsletterMsg ? (
            <p style={{color:'#6ee7b7',fontWeight:700,fontSize:'16px'}}>{newsletterMsg}</p>
          ) : (
            <div style={{display:'flex',gap:'8px',maxWidth:'400px',margin:'0 auto',flexWrap:'wrap'}}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" style={{flex:1,padding:'12px 16px',borderRadius:'999px',border:'none',fontSize:'14px',minWidth:'200px'}}/>
              <button onClick={inscrireNewsletter} style={{background:'#fff',color:VIOLET,padding:'12px 24px',borderRadius:'999px',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>S'inscrire</button>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}
