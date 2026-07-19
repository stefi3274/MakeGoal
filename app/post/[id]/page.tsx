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


type Post = {
  id: string; titre: string; contenu: string | null;
  langue: string; source_nom: string | null; source_url: string | null;
  tags: string[] | null;
  pays1: string | null; pays2: string | null;
  image_couverture: string | null; auteur: string; created_at: string;
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

  useEffect(() => { if (id) charger(); }, [id]);

  const charger = async () => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).eq('publie', true).single();
    if (data) setPost(data);
    setLoading(false);
  };

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

            {post.pays1 && post.pays2 && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'20px',margin:'8px 0 24px',padding:'20px',background:'#faf5ff',borderRadius:'16px'}}>
                <div style={{textAlign:'center',flex:1}}>
                  <div style={{fontSize:'56px',lineHeight:1}}>{drapeau(post.pays1)}</div>
                  <div style={{fontWeight:900,fontSize:'15px',color:'#111',marginTop:'8px'}}>{post.pays1}</div>
                </div>
                <div style={{color:VIOLET,fontWeight:900,fontSize:'22px'}}>VS</div>
                <div style={{textAlign:'center',flex:1}}>
                  <div style={{fontSize:'56px',lineHeight:1}}>{drapeau(post.pays2)}</div>
                  <div style={{fontWeight:900,fontSize:'15px',color:'#111',marginTop:'8px'}}>{post.pays2}</div>
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

      </main>
      <Footer />
    </div>
  );
}
