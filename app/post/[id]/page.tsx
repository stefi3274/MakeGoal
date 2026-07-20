'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import html2canvas from 'html2canvas';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const VIOLET = '#bf00ff';
// Remplacez cette URL par celle de votre logo (Supabase Storage bucket images)
const LOGO_URL = 'https://giflxfycfqanyfaeoedz.supabase.co/storage/v1/object/public/images/logo%20makegoal.jpg';

const couleurTag = (t: string) => {
  if (t === 'Officiel') return '#10b981';
  if (t === 'En attente') return '#f59e0b';
  if (t === 'Transfert') return '#3b82f6';
  if (t === 'Match terminé') return '#111111';
  if (t === 'Mi-temps') return '#ef4444';
  if (t === 'Statistiques') return '#8b5cf6';
  return '#bf00ff';
};

const DRAPEAUX: Record<string, string> = {
  'france': '🇫🇷', 'haiti': '🇭🇹', 'haïti': '🇭🇹', 'bresil': '🇧🇷', 'brésil': '🇧🇷',
  'argentine': '🇦🇷', 'espagne': '🇪🇸', 'angleterre': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'allemagne': '🇩🇪',
  'portugal': '🇵🇹', 'italie': '🇮🇹', 'belgique': '🇧🇪', 'pays-bas': '🇳🇱', 'hollande': '🇳🇱',
  'usa': '🇺🇸', 'etats-unis': '🇺🇸', 'états-unis': '🇺🇸', 'canada': '🇨🇦', 'mexique': '🇲🇽',
  'maroc': '🇲🇦', 'senegal': '🇸🇳', 'sénégal': '🇸🇳', 'cameroun': '🇨🇲', 'nigeria': '🇳🇬',
  'ghana': '🇬🇭', 'algerie': '🇩🇿', 'algérie': '🇩🇿', 'tunisie': '🇹🇳', 'egypte': '🇪🇬', 'égypte': '🇪🇬',
  'cote d\'ivoire': '🇨🇮', "côte d'ivoire": '🇨🇮', 'colombie': '🇨🇴', 'uruguay': '🇺🇾',
  'chili': '🇨🇱', 'perou': '🇵🇪', 'pérou': '🇵🇪', 'japon': '🇯🇵', 'coree du sud': '🇰🇷',
  'corée du sud': '🇰🇷', 'croatie': '🇭🇷', 'suisse': '🇨🇭', 'pologne': '🇵🇱', 'danemark': '🇩🇰',
  'suede': '🇸🇪', 'suède': '🇸🇪', 'norvege': '🇳🇴', 'norvège': '🇳🇴', 'ecosse': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'écosse': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'jamaique': '🇯🇲', 'jamaïque': '🇯🇲', 'panama': '🇵🇦', 'costa rica': '🇨🇷', 'honduras': '🇭🇳',
  'republique dominicaine': '🇩🇴', 'république dominicaine': '🇩🇴', 'venezuela': '🇻🇪', 'equateur': '🇪🇨', 'équateur': '🇪🇨',
  'australie': '🇦🇺', 'qatar': '🇶🇦', 'arabie saoudite': '🇸🇦', 'iran': '🇮🇷', 'turquie': '🇹🇷',
  'grece': '🇬🇷', 'grèce': '🇬🇷', 'serbie': '🇷🇸', 'ukraine': '🇺🇦', 'russie': '🇷🇺'
};
const drapeau = (pays: string) => DRAPEAUX[pays.toLowerCase().trim()] || '🏳️';


const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '4-4-2': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:16,y:46},{x:38,y:48},{x:62,y:48},{x:84,y:46},{x:38,y:20},{x:62,y:20}],
  '4-3-3': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:30,y:48},{x:50,y:50},{x:70,y:48},{x:22,y:22},{x:50,y:18},{x:78,y:22}],
  '4-2-3-1': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:36,y:54},{x:64,y:54},{x:22,y:32},{x:50,y:34},{x:78,y:32},{x:50,y:14}],
  '3-5-2': [{x:50,y:92},{x:28,y:74},{x:50,y:76},{x:72,y:74},{x:12,y:50},{x:34,y:50},{x:50,y:52},{x:66,y:50},{x:88,y:50},{x:38,y:22},{x:62,y:22}],
  '3-4-3': [{x:50,y:92},{x:28,y:74},{x:50,y:76},{x:72,y:74},{x:16,y:50},{x:38,y:50},{x:62,y:50},{x:84,y:50},{x:22,y:22},{x:50,y:18},{x:78,y:22}],
  '5-3-2': [{x:50,y:92},{x:12,y:70},{x:31,y:74},{x:50,y:76},{x:69,y:74},{x:88,y:70},{x:30,y:48},{x:50,y:50},{x:70,y:48},{x:38,y:22},{x:62,y:22}],
  '4-4-1-1': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:16,y:50},{x:38,y:50},{x:62,y:50},{x:84,y:50},{x:50,y:30},{x:50,y:12}]
};

const couleurStatut = (s: string) => {
  if (s === 'Mi-temps') return '#ef4444';
  if (s === 'Match terminé') return '#111111';
  if (s === 'À venir') return '#3b82f6';
  return '#bf00ff';
};


type Post = {
  id: string; titre: string; contenu: string | null;
  langue: string; source_nom: string | null; source_url: string | null;
  tags: string[] | null;
  pays1: string | null; pays2: string | null;
  ligue: string | null; ligue_logo: string | null;
  equipe1: string | null; equipe2: string | null;
  score1: number | null; score2: number | null; statut_match: string | null;
  distinction_type: string | null; laureat: string | null; distinction_note: string | null; distinction_stats: string | null;
  formation: string | null; onze: { nom: string; equipe: string }[] | null;
  image_couverture: string | null; auteur: string; created_at: string;
};
type Commentaire = {
  id: string; user_id: string; contenu: string; created_at: string;
  username: string; likes: number; likedByMe: boolean;
};

export default function PostPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<'carre' | 'vertical'>('carre');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [nouveauComm, setNouveauComm] = useState('');
  const [partageMsg, setPartageMsg] = useState('');

  useEffect(() => { if (id) charger(); }, [id]);

  const charger = async () => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).eq('publie', true).single();
    if (data) { setPost(data); chargerLikes(); chargerCommentaires(); }
    setLoading(false);
  };

  useEffect(() => { if (user) verifierAdmin(); }, [user]);

  const verifierAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single();
    setIsAdmin(!!data);
  };

  const chargerLikes = async () => {
    const { data } = await supabase.from('article_likes').select('user_id').eq('article_id', id);
    if (data) { setLikes(data.length); if (user) setLikedByMe(data.some(l => l.user_id === user.id)); }
  };

  const chargerCommentaires = async () => {
    const { data: comms } = await supabase.from('commentaires').select('*').eq('article_id', id).is('parent_id', null).order('created_at', { ascending: false });
    if (!comms) return;
    const userIds = [...new Set(comms.map(c => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
    const { data: allLikes } = await supabase.from('commentaire_likes').select('commentaire_id, user_id');
    const enrichis: Commentaire[] = comms.map(c => {
      const lk = (allLikes || []).filter(l => l.commentaire_id === c.id);
      return { id: c.id, user_id: c.user_id, contenu: c.contenu, created_at: c.created_at,
        username: profiles?.find(p => p.id === c.user_id)?.username || 'Anonyme',
        likes: lk.length, likedByMe: user ? lk.some(l => l.user_id === user.id) : false };
    });
    setCommentaires(enrichis);
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

  const posterComm = async () => {
    if (!user) { window.location.href = '/compte'; return; }
    if (!nouveauComm.trim()) return;
    await supabase.from('commentaires').insert({ article_id: id, user_id: user.id, contenu: nouveauComm.trim(), parent_id: null });
    setNouveauComm(''); chargerCommentaires();
  };

  const toggleLikeComm = async (cm: Commentaire) => {
    if (!user) { window.location.href = '/compte'; return; }
    if (cm.likedByMe) await supabase.from('commentaire_likes').delete().eq('commentaire_id', cm.id).eq('user_id', user.id);
    else await supabase.from('commentaire_likes').insert({ commentaire_id: cm.id, user_id: user.id });
    chargerCommentaires();
  };

  const supprimerComm = async (cid: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    await supabase.from('commentaires').delete().eq('id', cid);
    chargerCommentaires();
  };

  const partager = (reseau: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const texte = post ? post.titre + ' — MakeGoal' : 'MakeGoal';
    if (reseau === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(texte + ' ' + url), '_blank');
    else if (reseau === 'facebook') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
    else if (reseau === 'twitter') window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(texte) + '&url=' + encodeURIComponent(url), '_blank');
    else if (reseau === 'telegram') window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(texte), '_blank');
    else if (reseau === 'copier') { navigator.clipboard.writeText(url); setPartageMsg('Lien copié ✓'); setTimeout(() => setPartageMsg(''), 2000); }
  };

  const formatComm = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

  const telecharger = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = 'makegoal-post-' + format + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      alert('Erreur lors du téléchargement. Réessayez.');
    }
    setDownloading(false);
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}><Header /><main style={{maxWidth:'700px',margin:'0 auto',padding:'48px 24px'}}><p style={{color:'#9ca3af'}}>Chargement…</p></main><Footer /></div>
  );

  if (!post) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}><Header /><main style={{maxWidth:'700px',margin:'0 auto',padding:'48px 24px',textAlign:'center'}}><h1 style={{fontWeight:900,fontSize:'24px'}}>Post introuvable</h1><a href="/" style={{color:VIOLET,fontWeight:600}}>← Accueil</a></main><Footer /></div>
  );

  const dims = format === 'carre' ? { width: 500, minHeight: 500 } : { width: 400, minHeight: 640 };

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'700px',margin:'0 auto',padding:'32px 16px'}}>

        <a href="/" style={{color:VIOLET,fontSize:'14px',textDecoration:'none',fontWeight:600,display:'inline-block',marginBottom:'20px'}}>← Retour</a>

        <div style={{display:'flex',gap:'8px',marginBottom:'20px',justifyContent:'center'}}>
          <button onClick={() => setFormat('carre')} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:format==='carre'?VIOLET:'#e5e7eb',color:format==='carre'?'#fff':'#374151'}}>⬜ Carré</button>
          <button onClick={() => setFormat('vertical')} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:format==='vertical'?VIOLET:'#e5e7eb',color:format==='vertical'?'#fff':'#374151'}}>📱 Vertical</button>
        </div>

        <div style={{display:'flex',justifyContent:'center',marginBottom:'24px'}}>
          <div ref={cardRef} style={{
            width: dims.width + 'px', minHeight: dims.minHeight + 'px',
            background:'#ffffff', border:'1px solid #eee',
            display:'flex', flexDirection:'column', padding:'40px 36px', boxSizing:'border-box',
            position:'relative'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'28px'}}>
              {LOGO_URL ? (
                <img src={LOGO_URL} alt="MakeGoal" style={{height:'40px'}}/>
              ) : (
                <span style={{color:VIOLET,fontWeight:900,fontSize:'26px'}}>MakeGoal</span>
              )}
              <span style={{marginLeft:'auto',fontSize:'13px',fontWeight:700,color:'#fff',background:VIOLET,padding:'4px 12px',borderRadius:'999px'}}>
                {post.langue==='kreyol' ? '🇭🇹 Kreyòl' : '🇫🇷 Actu'}
              </span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'16px'}}>
                {post.tags.map(t => (
                  <span key={t} style={{fontSize:'12px',fontWeight:900,color:'#fff',background:couleurTag(t),padding:'4px 12px',borderRadius:'999px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{t}</span>
                ))}
              </div>
            )}

            {(post.pays1 && post.pays2) || (post.equipe1 && post.equipe2) ? (
              <div style={{margin:'8px 0 24px',padding:'20px',background:'#faf5ff',borderRadius:'16px'}}>
                {(post.ligue || post.ligue_logo) && (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'16px'}}>
                    {post.ligue_logo && <img src={post.ligue_logo} alt="" style={{height:'24px'}}/>}
                    {post.ligue && <span style={{fontSize:'13px',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.5px'}}>{post.ligue}</span>}
                  </div>
                )}
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'16px'}}>
                  <div style={{textAlign:'center',flex:1}}>
                    {post.pays1 && <div style={{fontSize:'52px',lineHeight:1}}>{drapeau(post.pays1)}</div>}
                    <div style={{fontWeight:900,fontSize:'15px',color:'#111',marginTop:'8px'}}>{post.equipe1 || post.pays1}</div>
                  </div>
                  {post.score1 !== null && post.score2 !== null ? (
                    <div style={{textAlign:'center'}}>
                      <div style={{fontWeight:900,fontSize:'40px',color:VIOLET,lineHeight:1}}>{post.score1}-{post.score2}</div>
                    </div>
                  ) : (
                    <div style={{color:VIOLET,fontWeight:900,fontSize:'22px'}}>VS</div>
                  )}
                  <div style={{textAlign:'center',flex:1}}>
                    {post.pays2 && <div style={{fontSize:'52px',lineHeight:1}}>{drapeau(post.pays2)}</div>}
                    <div style={{fontWeight:900,fontSize:'15px',color:'#111',marginTop:'8px'}}>{post.equipe2 || post.pays2}</div>
                  </div>
                </div>
                {post.statut_match && (
                  <div style={{textAlign:'center',marginTop:'16px'}}>
                    <span style={{display:'inline-block',fontSize:'12px',fontWeight:900,color:'#fff',background:couleurStatut(post.statut_match),padding:'5px 16px',borderRadius:'999px',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                      {post.statut_match === 'Mi-temps' && '⏸ '}
                      {post.statut_match === 'Match terminé' && '✓ '}
                      {post.statut_match === 'À venir' && '🔜 '}
                      {post.statut_match}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {post.distinction_type && (
              <div style={{margin:'8px 0 24px',padding:'24px',background:'linear-gradient(135deg,#fef9e7,#faf5ff)',borderRadius:'16px',border:'2px solid #ffd700',textAlign:'center'}}>
                <div style={{fontSize:'40px',lineHeight:1,marginBottom:'8px'}}>🏆</div>
                <div style={{fontSize:'13px',fontWeight:900,color:'#b8860b',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>{post.distinction_type}</div>
                {post.laureat && <div style={{fontSize:'26px',fontWeight:900,color:'#111',marginBottom:'8px'}}>{post.laureat}</div>}
                {post.distinction_stats && (
                  <div style={{display:'inline-block',background:VIOLET,color:'#fff',fontSize:'14px',fontWeight:900,padding:'6px 18px',borderRadius:'999px',marginBottom:'10px'}}>📊 {post.distinction_stats}</div>
                )}
                {post.distinction_note && <p style={{fontSize:'14px',color:'#6b7280',fontStyle:'italic',margin:'8px 0 0',lineHeight:'1.5'}}>{post.distinction_note}</p>}
              </div>
            )}

            {post.formation && post.onze && FORMATIONS[post.formation] && (
              <div style={{margin:'8px 0 24px'}}>
                <div style={{textAlign:'center',marginBottom:'10px'}}>
                  <span style={{display:'inline-block',background:VIOLET,color:'#fff',fontSize:'13px',fontWeight:900,padding:'5px 16px',borderRadius:'999px'}}>Formation {post.formation}</span>
                </div>
                <div style={{position:'relative',width:'100%',paddingBottom:'125%',background:'linear-gradient(#2d7a3e,#1e5c2e)',borderRadius:'16px',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:'50%',left:0,right:0,height:'2px',background:'rgba(255,255,255,0.3)'}}/>
                  <div style={{position:'absolute',top:'50%',left:'50%',width:'80px',height:'80px',border:'2px solid rgba(255,255,255,0.3)',borderRadius:'50%',transform:'translate(-50%,-50%)'}}/>
                  <div style={{position:'absolute',bottom:0,left:'25%',right:'25%',height:'12%',border:'2px solid rgba(255,255,255,0.3)',borderBottom:'none'}}/>
                  <div style={{position:'absolute',top:0,left:'25%',right:'25%',height:'12%',border:'2px solid rgba(255,255,255,0.3)',borderTop:'none'}}/>
                  {FORMATIONS[post.formation].map((pos, i) => {
                    const j = post.onze![i];
                    if (!j) return null;
                    const dr = drapeau(j.equipe);
                    const estPays = dr !== '🏳️';
                    return (
                      <div key={i} style={{position:'absolute',left:pos.x+'%',top:pos.y+'%',transform:'translate(-50%,-50%)',textAlign:'center',width:'80px'}}>
                        <div style={{width:'30px',height:'30px',background:'#fff',borderRadius:'50%',margin:'0 auto 4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:900,color:VIOLET,boxShadow:'0 2px 6px rgba(0,0,0,0.3)'}}>{i+1}</div>
                        <div style={{background:'rgba(0,0,0,0.6)',borderRadius:'6px',padding:'2px 4px'}}>
                          <div style={{color:'#fff',fontSize:'10px',fontWeight:900,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{j.nom}</div>
                          {j.equipe && <div style={{color:'#e5e7eb',fontSize:'9px',lineHeight:1.3}}>{estPays ? dr : j.equipe}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{width:'40px',height:'4px',background:VIOLET,borderRadius:'2px',marginBottom:'24px'}}/>

            <h1 style={{color:'#111',fontWeight:900,fontSize: format==='carre'?'26px':'28px',lineHeight:'1.25',margin:'0 0 20px'}}>
              {post.titre}
            </h1>

            {post.contenu && (
              <p style={{color:'#374151',fontSize:'17px',lineHeight:'1.6',margin:'0 0 24px',whiteSpace:'pre-wrap',flex:1}}>
                {post.contenu}
              </p>
            )}

            {post.source_nom && (
              <div style={{background:'#faf5ff',borderLeft:'4px solid '+VIOLET,padding:'12px 16px',borderRadius:'8px',marginBottom:'20px'}}>
                <span style={{color:'#6b7280',fontSize:'13px'}}>Source : </span>
                <span style={{color:VIOLET,fontWeight:700,fontSize:'14px'}}>{post.source_nom}</span>
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto',paddingTop:'16px',borderTop:'1px solid #f3f4f6'}}>
              <span style={{color:'#9ca3af',fontSize:'12px',fontWeight:600}}>makegoal.vercel.app</span>
              <span style={{color:VIOLET,fontSize:'12px',fontWeight:900}}>⚽ MakeGoal</span>
            </div>
          </div>
        </div>

        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <button onClick={telecharger} disabled={downloading} style={{
            background:VIOLET, color:'#fff', border:'none', padding:'14px 32px',
            borderRadius:'999px', fontWeight:700, fontSize:'15px', cursor:'pointer'
          }}>
            {downloading ? '⏳ Génération...' : '⬇️ Télécharger l\'image'}
          </button>
          {post.source_url && (
            <p style={{marginTop:'16px'}}>
              <a href={post.source_url} target="_blank" rel="noopener noreferrer" style={{color:VIOLET,fontSize:'14px',fontWeight:600}}>Voir la source originale →</a>
            </p>
          )}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'20px 0',margin:'8px 0 24px',borderTop:'1px solid #e5e7eb',borderBottom:'1px solid #e5e7eb',flexWrap:'wrap'}}>
          <button onClick={toggleLike} style={{display:'flex',alignItems:'center',gap:'6px',padding:'10px 20px',borderRadius:'999px',border:'2px solid '+(likedByMe?VIOLET:'#e5e7eb'),background:likedByMe?'#faf5ff':'#fff',color:likedByMe?VIOLET:'#374151',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>
            {likedByMe ? '❤️' : '🤍'} {likes} J'aime
          </button>
          <span style={{color:'#9ca3af',fontSize:'13px'}}>💬 {commentaires.length}</span>
          <div style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center'}}>
            {partageMsg && <span style={{color:'#10b981',fontSize:'13px',fontWeight:700}}>{partageMsg}</span>}
            <button onClick={() => partager('whatsapp')} style={{padding:'8px 14px',borderRadius:'999px',border:'none',background:'#25D366',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>WhatsApp</button>
            <button onClick={() => partager('facebook')} style={{padding:'8px 14px',borderRadius:'999px',border:'none',background:'#1877f2',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>Facebook</button>
            <button onClick={() => partager('twitter')} style={{padding:'8px 14px',borderRadius:'999px',border:'none',background:'#000',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>X</button>
            <button onClick={() => partager('telegram')} style={{padding:'8px 14px',borderRadius:'999px',border:'none',background:'#0088cc',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>Telegram</button>
            <button onClick={() => partager('copier')} style={{padding:'8px 14px',borderRadius:'999px',border:'2px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>🔗</button>
          </div>
        </div>

        <div style={{marginBottom:'40px'}}>
          <h3 style={{fontWeight:900,fontSize:'20px',marginBottom:'16px'}}>💬 Commentaires ({commentaires.length})</h3>
          <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
            <input value={nouveauComm} onChange={e => setNouveauComm(e.target.value)} placeholder={user ? 'Ajouter un commentaire...' : 'Connectez-vous pour commenter'} onKeyDown={e => e.key === 'Enter' && posterComm()} style={{flex:1,padding:'12px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'14px'}}/>
            <button onClick={posterComm} style={{padding:'12px 20px',borderRadius:'12px',border:'none',background:VIOLET,color:'#fff',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Publier</button>
          </div>
          {commentaires.length === 0 && <p style={{color:'#9ca3af',fontSize:'14px'}}>Soyez le premier à commenter !</p>}
          {commentaires.map(cm => (
            <div key={cm.id} style={{background:'#f9fafb',borderRadius:'12px',padding:'16px',marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <span style={{fontWeight:700,fontSize:'14px'}}>{cm.username}</span>
                <span style={{color:'#9ca3af',fontSize:'12px'}}>{formatComm(cm.created_at)}</span>
              </div>
              <p style={{margin:'0 0 10px',fontSize:'15px',lineHeight:'1.5'}}>{cm.contenu}</p>
              <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
                <button onClick={() => toggleLikeComm(cm)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:cm.likedByMe?VIOLET:'#6b7280',fontWeight:700}}>{cm.likedByMe ? '❤️' : '🤍'} {cm.likes}</button>
                {(user?.id === cm.user_id || isAdmin) && <button onClick={() => supprimerComm(cm.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#ef4444',fontWeight:700}}>🗑️</button>}
              </div>
            </div>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
}
