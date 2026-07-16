'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../../lib/supabase';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const VIOLET = '#bf00ff';

type Article = {
  id: string;
  titre: string;
  categorie: string;
  image_couverture: string | null;
  contenu: string | null;
  auteur: string;
  created_at: string;
  vues: number;
};

export default function ArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    chargerArticle();
  }, [id]);

  const chargerArticle = async () => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).eq('publie', true).single();
    if (data) {
      setArticle(data);
      await supabase.from('articles').update({ vues: (data.vues || 0) + 1 }).eq('id', id);
    }
    setLoading(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const couleurCat = (cat: string) => cat === 'Actualités' ? '#3b82f6' : '#f59e0b';

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}><p style={{color:'#9ca3af'}}>Chargement…</p></main>
      <Footer />
    </div>
  );

  if (!article) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{fontWeight:900,fontSize:'24px',marginBottom:'12px'}}>Article introuvable</h1>
        <a href="/media" style={{color:VIOLET,fontWeight:600}}>← Retour au média</a>
      </main>
      <Footer />
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <main style={{maxWidth:'760px',margin:'0 auto',padding:'40px 24px'}}>

        <a href="/media" style={{color:VIOLET,fontSize:'14px',textDecoration:'none',fontWeight:600,display:'inline-block',marginBottom:'24px'}}>
          ← Tous les articles
        </a>

        <span style={{display:'inline-block',fontSize:'12px',fontWeight:700,color:'#fff',background:couleurCat(article.categorie),padding:'4px 12px',borderRadius:'999px',marginBottom:'16px'}}>
          {article.categorie}
        </span>

        <h1 style={{fontWeight:900,fontSize:'clamp(26px,4vw,38px)',margin:'0 0 12px',lineHeight:'1.2'}}>{article.titre}</h1>

        <p style={{color:'#6b7280',fontSize:'14px',margin:'0 0 24px'}}>
          Par {article.auteur} · {formatDate(article.created_at)}
        </p>

        {article.image_couverture && (
          <img src={article.image_couverture} alt={article.titre} style={{width:'100%',borderRadius:'16px',marginBottom:'32px',maxHeight:'420px',objectFit:'cover'}}/>
        )}

        <div className="article-contenu" style={{fontSize:'17px',lineHeight:'1.8',color:'#1f2937'}}>
          <ReactMarkdown
            components={{
              h1: ({children}) => <h1 style={{fontWeight:900,fontSize:'28px',margin:'32px 0 16px'}}>{children}</h1>,
              h2: ({children}) => <h2 style={{fontWeight:900,fontSize:'24px',margin:'28px 0 14px'}}>{children}</h2>,
              h3: ({children}) => <h3 style={{fontWeight:700,fontSize:'20px',margin:'24px 0 12px'}}>{children}</h3>,
              p: ({children}) => <p style={{margin:'0 0 20px'}}>{children}</p>,
              img: ({src, alt}) => <img src={src as string} alt={alt || ''} style={{width:'100%',borderRadius:'12px',margin:'24px 0'}}/>,
              a: ({href, children}) => <a href={href as string} target="_blank" rel="noopener noreferrer" style={{color:VIOLET,fontWeight:600}}>{children}</a>,
              ul: ({children}) => <ul style={{margin:'0 0 20px',paddingLeft:'24px'}}>{children}</ul>,
              ol: ({children}) => <ol style={{margin:'0 0 20px',paddingLeft:'24px'}}>{children}</ol>,
              li: ({children}) => <li style={{margin:'0 0 8px'}}>{children}</li>,
              blockquote: ({children}) => <blockquote style={{borderLeft:'4px solid '+VIOLET,paddingLeft:'16px',margin:'0 0 20px',color:'#6b7280',fontStyle:'italic'}}>{children}</blockquote>,
              strong: ({children}) => <strong style={{fontWeight:700}}>{children}</strong>,
            }}
          >
            {article.contenu || ''}
          </ReactMarkdown>
        </div>

        <div style={{marginTop:'40px',paddingTop:'24px',borderTop:'1px solid #e5e7eb',textAlign:'center'}}>
          <a href="/media" style={{color:VIOLET,fontWeight:700,fontSize:'15px',textDecoration:'none'}}>← Retour aux articles</a>
        </div>

      </main>
      <Footer />
    </div>
  );
}
