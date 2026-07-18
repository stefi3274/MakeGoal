'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const VIOLET = '#bf00ff';

type Article = {
  id: string; titre: string; categorie: string;
  image_couverture: string | null; contenu: string | null;
  auteur: string; created_at: string; vues: number;
};
type Commentaire = {
  id: string; user_id: string; parent_id: string | null;
  contenu: string; created_at: string; username: string;
  likes: number; likedByMe: boolean;
};
type ArticleCard = { id: string; titre: string; image_couverture: string | null; categorie: string; };

export default function ArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [nouveauComm, setNouveauComm] = useState('');
  const [reponseA, setReponseA] = useState<string | null>(null);
  const [texteReponse, setTexteReponse] = useState('');
  const [partageMsg, setPartageMsg] = useState('');
  const [autres, setAutres] = useState<ArticleCard[]>([]);

  useEffect(() => { if (id) chargerArticle(); }, [id]);
  useEffect(() => { if (user) verifierAdmin(); }, [user]);

  const verifierAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single();
    setIsAdmin(!!data);
  };

  const chargerArticle = async () => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).eq('publie', true).single();
    if (data) {
      setArticle(data);
      await supabase.from('articles').update({ vues: (data.vues || 0) + 1 }).eq('id', id);
      chargerLikes();
      chargerCommentaires();
      chargerAutres(data.id);
    }
    setLoading(false);
  };

  const chargerLikes = async () => {
    const { data } = await supabase.from('article_likes').select('user_id').eq('article_id', id);
    if (data) {
      setLikes(data.length);
      if (user) setLikedByMe(data.some(l => l.user_id === user.id));
    }
  };

  const chargerCommentaires = async () => {
    const { data: comms } = await supabase.from('commentaires').select('*').eq('article_id', id).order('created_at', { ascending: true });
    if (!comms) return;
    const userIds = [...new Set(comms.map(c => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
    const { data: allLikes } = await supabase.from('commentaire_likes').select('commentaire_id, user_id');
    const enrichis: Commentaire[] = comms.map(c => {
      const likesComm = (allLikes || []).filter(l => l.commentaire_id === c.id);
      return {
        ...c,
        username: profiles?.find(p => p.id === c.user_id)?.username || 'Anonyme',
        likes: likesComm.length,
        likedByMe: user ? likesComm.some(l => l.user_id === user.id) : false
      };
    });
    setCommentaires(enrichis);
  };

  const chargerAutres = async (articleId: string) => {
    const { data } = await supabase.from('articles').select('id, titre, image_couverture, categorie').eq('publie', true).neq('id', articleId).order('created_at', { ascending: false }).limit(3);
    if (data) setAutres(data);
  };

  const toggleLike = async () => {
    if (!user) { window.location.href = '/compte'; return; }
    if (likedByMe) {
      await supabase.from('article_likes').delete().eq('article_id', id).eq('user_id', user.id);
      setLikes(l => l - 1); setLikedByMe(false);
    } else {
      await supabase.from('article_likes').insert({ article_id: id, user_id: user.id });
      setLikes(l => l + 1); setLikedByMe(true);
    }
  };

  const posterCommentaire = async () => {
    if (!user) { window.location.href = '/compte'; return; }
    if (!nouveauComm.trim()) return;
    await supabase.from('commentaires').insert({ article_id: id, user_id: user.id, contenu: nouveauComm.trim(), parent_id: null });
    setNouveauComm('');
    chargerCommentaires();
  };

  const posterReponse = async (parentId: string) => {
    if (!user) { window.location.href = '/compte'; return; }
    if (!texteReponse.trim()) return;
    await supabase.from('commentaires').insert({ article_id: id, user_id: user.id, contenu: texteReponse.trim(), parent_id: parentId });
    setTexteReponse(''); setReponseA(null);
    chargerCommentaires();
  };

  const toggleLikeComm = async (comm: Commentaire) => {
    if (!user) { window.location.href = '/compte'; return; }
    if (comm.likedByMe) {
      await supabase.from('commentaire_likes').delete().eq('commentaire_id', comm.id).eq('user_id', user.id);
    } else {
      await supabase.from('commentaire_likes').insert({ commentaire_id: comm.id, user_id: user.id });
    }
    chargerCommentaires();
  };

  const supprimerComm = async (commId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    await supabase.from('commentaires').delete().eq('id', commId);
    chargerCommentaires();
  };

  const partager = (reseau: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const texte = article ? article.titre + ' — MakeGoal' : 'MakeGoal';
    if (reseau === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(texte + ' ' + url), '_blank');
    else if (reseau === 'facebook') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
    else if (reseau === 'copier') { navigator.clipboard.writeText(url); setPartageMsg('Lien copié ✓'); setTimeout(() => setPartageMsg(''), 2000); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatDateComm = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const couleurCat = (cat: string) => cat === 'Actualités' ? '#3b82f6' : '#f59e0b';

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}><Header /><main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px'}}><p style={{color:'#9ca3af'}}>Chargement…</p></main><Footer /></div>
  );

  if (!article) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}><Header /><main style={{maxWidth:'760px',margin:'0 auto',padding:'48px 24px',textAlign:'center'}}><h1 style={{fontWeight:900,fontSize:'24px',marginBottom:'12px'}}>Article introuvable</h1><a href="/" style={{color:VIOLET,fontWeight:600}}>← Retour à l'accueil</a></main><Footer /></div>
  );

  const commentairesRacine = commentaires.filter(c => !c.parent_id);
  const reponses = (parentId: string) => commentaires.filter(c => c.parent_id === parentId);

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'760px',margin:'0 auto',padding:'40px 24px'}}>

        <a href="/" style={{color:VIOLET,fontSize:'14px',textDecoration:'none',fontWeight:600,display:'inline-block',marginBottom:'24px'}}>← Tous les articles</a>

        <span style={{display:'inline-block',fontSize:'12px',fontWeight:700,color:'#fff',background:couleurCat(article.categorie),padding:'4px 12px',borderRadius:'999px',marginBottom:'16px'}}>{article.categorie}</span>

        <h1 style={{fontWeight:900,fontSize:'clamp(26px,4vw,38px)',margin:'0 0 12px',lineHeight:'1.2'}}>{article.titre}</h1>
        <p style={{color:'#6b7280',fontSize:'14px',margin:'0 0 24px'}}>Par {article.auteur} · {formatDate(article.created_at)}</p>

        {article.image_couverture && <img src={article.image_couverture} alt={article.titre} style={{width:'100%',borderRadius:'16px',marginBottom:'32px',maxHeight:'420px',objectFit:'cover'}}/>}

        <div style={{fontSize:'17px',lineHeight:'1.8',color:'#1f2937'}}>
          <ReactMarkdown components={{
            h1: ({children}) => <h1 style={{fontWeight:900,fontSize:'28px',margin:'32px 0 16px'}}>{children}</h1>,
            h2: ({children}) => <h2 style={{fontWeight:900,fontSize:'24px',margin:'28px 0 14px'}}>{children}</h2>,
            h3: ({children}) => <h3 style={{fontWeight:700,fontSize:'20px',margin:'24px 0 12px'}}>{children}</h3>,
            p: ({children}) => <p style={{margin:'0 0 20px'}}>{children}</p>,
            img: ({src, alt}) => <img src={src as string} alt={alt || ''} style={{width:'100%',borderRadius:'12px',margin:'24px 0'}}/>,
            a: ({href, children}) => <a href={href as string} target="_blank" rel="noopener noreferrer" style={{color:VIOLET,fontWeight:600}}>{children}</a>,
            ul: ({children}) => <ul style={{margin:'0 0 20px',paddingLeft:'24px'}}>{children}</ul>,
            li: ({children}) => <li style={{margin:'0 0 8px'}}>{children}</li>,
            blockquote: ({children}) => <blockquote style={{borderLeft:'4px solid '+VIOLET,paddingLeft:'16px',margin:'0 0 20px',color:'#6b7280',fontStyle:'italic'}}>{children}</blockquote>,
            strong: ({children}) => <strong style={{fontWeight:700}}>{children}</strong>,
          }}>{article.contenu || ''}</ReactMarkdown>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'20px 0',margin:'32px 0',borderTop:'1px solid #e5e7eb',borderBottom:'1px solid #e5e7eb',flexWrap:'wrap'}}>
          <button onClick={toggleLike} style={{display:'flex',alignItems:'center',gap:'6px',padding:'10px 20px',borderRadius:'999px',border:'2px solid '+(likedByMe?VIOLET:'#e5e7eb'),background:likedByMe?'#faf5ff':'#fff',color:likedByMe?VIOLET:'#374151',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>
            {likedByMe ? '❤️' : '🤍'} {likes} J'aime
          </button>
          <span style={{color:'#9ca3af',fontSize:'13px'}}>💬 {commentairesRacine.length}</span>
          <div style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center'}}>
            {partageMsg && <span style={{color:'#10b981',fontSize:'13px',fontWeight:700}}>{partageMsg}</span>}
            <button onClick={() => partager('whatsapp')} style={{padding:'8px 14px',borderRadius:'999px',border:'none',background:'#25D366',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>WhatsApp</button>
            <button onClick={() => partager('facebook')} style={{padding:'8px 14px',borderRadius:'999px',border:'none',background:'#1877f2',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>Facebook</button>
            <button onClick={() => partager('copier')} style={{padding:'8px 14px',borderRadius:'999px',border:'2px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>🔗</button>
          </div>
        </div>

        <div style={{marginBottom:'40px'}}>
          <h3 style={{fontWeight:900,fontSize:'20px',marginBottom:'16px'}}>💬 Commentaires ({commentairesRacine.length})</h3>

          <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
            <input value={nouveauComm} onChange={e => setNouveauComm(e.target.value)} placeholder={user ? 'Ajouter un commentaire...' : 'Connectez-vous pour commenter'} onKeyDown={e => e.key === 'Enter' && posterCommentaire()} style={{flex:1,padding:'12px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'14px'}}/>
            <button onClick={posterCommentaire} style={{padding:'12px 20px',borderRadius:'12px',border:'none',background:VIOLET,color:'#fff',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Publier</button>
          </div>

          {commentairesRacine.length === 0 && <p style={{color:'#9ca3af',fontSize:'14px'}}>Soyez le premier à commenter !</p>}

          {commentairesRacine.map(c => (
            <div key={c.id} style={{marginBottom:'20px'}}>
              <div style={{background:'#f9fafb',borderRadius:'12px',padding:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                  <span style={{fontWeight:700,fontSize:'14px'}}>{c.username}</span>
                  <span style={{color:'#9ca3af',fontSize:'12px'}}>{formatDateComm(c.created_at)}</span>
                </div>
                <p style={{margin:'0 0 10px',fontSize:'15px',lineHeight:'1.5'}}>{c.contenu}</p>
                <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
                  <button onClick={() => toggleLikeComm(c)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:c.likedByMe?VIOLET:'#6b7280',fontWeight:700}}>{c.likedByMe ? '❤️' : '🤍'} {c.likes}</button>
                  <button onClick={() => { setReponseA(reponseA === c.id ? null : c.id); setTexteReponse(''); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#6b7280',fontWeight:700}}>↩️ Répondre</button>
                  {(user?.id === c.user_id || isAdmin) && <button onClick={() => supprimerComm(c.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#ef4444',fontWeight:700}}>🗑️</button>}
                </div>
              </div>

              {reponseA === c.id && (
                <div style={{display:'flex',gap:'8px',marginTop:'8px',marginLeft:'24px'}}>
                  <input value={texteReponse} onChange={e => setTexteReponse(e.target.value)} placeholder="Votre réponse..." onKeyDown={e => e.key === 'Enter' && posterReponse(c.id)} style={{flex:1,padding:'10px 14px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}}/>
                  <button onClick={() => posterReponse(c.id)} style={{padding:'10px 16px',borderRadius:'10px',border:'none',background:VIOLET,color:'#fff',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>Envoyer</button>
                </div>
              )}

              {reponses(c.id).map(r => (
                <div key={r.id} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:'12px',padding:'14px',marginTop:'8px',marginLeft:'24px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                    <span style={{fontWeight:700,fontSize:'13px'}}>{r.username}</span>
                    <span style={{color:'#9ca3af',fontSize:'11px'}}>{formatDateComm(r.created_at)}</span>
                  </div>
                  <p style={{margin:'0 0 8px',fontSize:'14px',lineHeight:'1.5'}}>{r.contenu}</p>
                  <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
                    <button onClick={() => toggleLikeComm(r)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:r.likedByMe?VIOLET:'#6b7280',fontWeight:700}}>{r.likedByMe ? '❤️' : '🤍'} {r.likes}</button>
                    {(user?.id === r.user_id || isAdmin) && <button onClick={() => supprimerComm(r.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:'#ef4444',fontWeight:700}}>🗑️</button>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {autres.length > 0 && (
          <div style={{marginTop:'40px',paddingTop:'32px',borderTop:'1px solid #e5e7eb'}}>
            <h3 style={{fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>À lire aussi</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'16px'}}>
              {autres.map(a => (
                <a key={a.id} href={'/media/' + a.id} style={{textDecoration:'none',color:'inherit'}}>
                  <div style={{border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden',cursor:'pointer'}}>
                    {a.image_couverture ? <img src={a.image_couverture} alt={a.titre} style={{width:'100%',height:'110px',objectFit:'cover'}}/> : <div style={{width:'100%',height:'110px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:'28px'}}>⚽</span></div>}
                    <div style={{padding:'12px'}}>
                      <span style={{fontSize:'10px',fontWeight:700,color:couleurCat(a.categorie)}}>{a.categorie}</span>
                      <p style={{fontWeight:700,fontSize:'14px',margin:'4px 0 0',lineHeight:'1.3'}}>{a.titre}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
