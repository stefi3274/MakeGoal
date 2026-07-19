'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

type Article = {
  id: string;
  titre: string;
  categorie: string;
  type: string;
  langue: string;
  image_couverture: string | null;
  extrait: string | null;
  auteur: string;
  created_at: string;
};

export default function Media() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tous');

  useEffect(() => { chargerArticles(); }, []);

  const chargerArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, titre, categorie, type, langue, image_couverture, extrait, auteur, created_at')
      .eq('publie', true)
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
    setLoading(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const articlesFiltres = filtre === 'Tous' ? articles : articles.filter(a => a.categorie === filtre);

  const couleurCat = (cat: string) => cat === 'Actualités' ? '#3b82f6' : '#f59e0b';

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(28px,5vw,44px)',margin:'0 0 12px'}}>
          📰 MakeGoal Média
        </h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'17px',margin:0}}>
          Actualités, analyses et revues de presse du football.
        </p>
      </div>

      <main style={{maxWidth:'1000px',margin:'0 auto',padding:'40px 16px'}}>

        <div style={{display:'flex',gap:'8px',marginBottom:'32px',justifyContent:'center',flexWrap:'wrap'}}>
          {['Tous', 'Actualités', 'Revue de presse'].map(cat => (
            <button key={cat} onClick={() => setFiltre(cat)} style={{
              padding:'10px 20px', borderRadius:'999px', fontWeight:700, fontSize:'14px', cursor:'pointer',
              border: 'none',
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
            <a key={a.id} href={(a.type === 'post' ? '/post/' : '/media/') + a.id} style={{textDecoration:'none',color:'inherit'}}>
              <div style={{
                border:'1px solid #e5e7eb', borderRadius:'20px', overflow:'hidden',
                boxShadow:'0 2px 12px rgba(0,0,0,0.06)', height:'100%',
                display:'flex', flexDirection:'column', cursor:'pointer'
              }}>
                {a.image_couverture ? (
                  <img src={a.image_couverture} alt={a.titre} style={{width:'100%',height:'180px',objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:'180px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'40px'}}>{a.type === 'post' ? '⚡' : '⚽'}</span>
                  </div>
                )}
                <div style={{padding:'20px',flex:1,display:'flex',flexDirection:'column'}}>
                  <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'11px',fontWeight:700,color:'#fff',background:couleurCat(a.categorie),padding:'3px 10px',borderRadius:'999px'}}>{a.categorie}</span>
                    {a.type === 'post' && <span style={{fontSize:'11px',fontWeight:700,color:'#fff',background:VIOLET,padding:'3px 10px',borderRadius:'999px'}}>⚡ Post</span>}
                    <span style={{fontSize:'11px',fontWeight:700,color:'#374151',background:'#f3f4f6',padding:'3px 10px',borderRadius:'999px'}}>{a.langue === 'kreyol' ? '🇭🇹 Kreyòl' : '🇫🇷 FR'}</span>
                  </div>
                  <h2 style={{fontWeight:900,fontSize:'18px',margin:'0 0 8px',lineHeight:'1.3'}}>{a.titre}</h2>
                  {a.extrait && <p style={{color:'#6b7280',fontSize:'14px',margin:'0 0 12px',lineHeight:'1.5',flex:1}}>{a.extrait}</p>}
                  <p style={{color:'#9ca3af',fontSize:'12px',margin:0}}>{a.auteur} · {formatDate(a.created_at)}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
}
