'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

type Concours = {
  id: string;
  titre: string;
  description: string | null;
  equipe1: string;
  equipe2: string;
  date_match: string;
  statut: string;
  lots: string | null;
};

type Classement = {
  user_id: string;
  username: string;
  points: number;
};

export default function ConcoursPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [concours, setConcours] = useState<Concours | null>(null);
  const [loading, setLoading] = useState(true);
  const [choix1x2, setChoix1x2] = useState('');
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');
  const [buteurs, setButeurs] = useState(['', '', '']);
  const [dejaParticipe, setDejaParticipe] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [classement, setClassement] = useState<Classement[]>([]);
  const [partageMsg, setPartageMsg] = useState('');
  const [vue, setVue] = useState<'participer' | 'classement'>('participer');

  useEffect(() => {
    chargerConcours();
  }, []);

  useEffect(() => {
    if (user && concours) chargerMaParticipation();
  }, [user, concours]);

  const chargerConcours = async () => {
    const { data } = await supabase
      .from('concours')
      .select('*')
      .in('statut', ['ouvert', 'ferme'])
      .order('date_match', { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setConcours(data);
      chargerClassement(data.id);
    }
    setLoading(false);
  };

  const chargerMaParticipation = async () => {
    if (!user || !concours) return;
    const { data } = await supabase
      .from('participations')
      .select('*')
      .eq('user_id', user.id)
      .eq('concours_id', concours.id)
      .single();
    if (data) {
      setDejaParticipe(true);
      setChoix1x2(data.choix_1x2 || '');
      setScoreHome(data.score_home?.toString() || '');
      setScoreAway(data.score_away?.toString() || '');
      setButeurs([data.buteurs?.[0] || '', data.buteurs?.[1] || '', data.buteurs?.[2] || '']);
    }
  };

  const chargerClassement = async (concoursId: string) => {
    const { data: parts } = await supabase
      .from('participations')
      .select('user_id, points')
      .eq('concours_id', concoursId)
      .order('points', { ascending: false })
      .limit(100);
    if (!parts) return;
    const userIds = parts.map(p => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    const classementData: Classement[] = parts.map(p => ({
      user_id: p.user_id,
      username: profiles?.find(pr => pr.id === p.user_id)?.username || 'Anonyme',
      points: p.points
    }));
    setClassement(classementData);
  };

  const participer = async () => {
    if (!user) { router.push('/compte?ref_concours=1'); return; }
    if (!choix1x2) { setMessage('❌ Choisissez un résultat (1, X ou 2).'); return; }
    if (scoreHome === '' || scoreAway === '') { setMessage('❌ Entrez un score exact.'); return; }
    if (!concours) return;
    setSaving(true); setMessage('');
    const buteursNettoyes = buteurs.filter(b => b.trim() !== '');
    const { error } = await supabase.from('participations').upsert({
      user_id: user.id,
      concours_id: concours.id,
      choix_1x2: choix1x2,
      score_home: parseInt(scoreHome),
      score_away: parseInt(scoreAway),
      buteurs: buteursNettoyes
    }, { onConflict: 'user_id,concours_id' });
    setSaving(false);
    if (error) {
      setMessage('❌ Erreur : ' + error.message);
    } else {
      setMessage('✅ Participation enregistrée ! Partagez pour gagner plus de points.');
      setDejaParticipe(true);
    }
  };const partagerWhatsApp = () => {
    if (!user || !concours) return;
    const lien = 'https://makegoal.vercel.app/compte?ref=' + user.id;
    let texte = '🏆 *MakeGoal — Concours ' + concours.titre + '*\n\n';
    texte += '⚽ ' + concours.equipe1 + ' vs ' + concours.equipe2 + '\n';
    texte += '🎁 À gagner : ' + (concours.lots || '10 000 Gourdes, tablettes, Netflix') + '\n\n';
    texte += '🔥 Rejoins-moi, vote et gagne ! Inscris-toi avec mon lien :\n';
    texte += lien + '\n\n';
    texte += '🌐 makegoal.vercel.app';
    window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank');
    setPartageMsg('Lien de parrainage partagé ✓');
    setTimeout(() => setPartageMsg(''), 3000);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  });

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'800px',margin:'0 auto',padding:'48px 24px'}}><p style={{color:'#9ca3af'}}>Chargement…</p></main>
      <Footer />
    </div>
  );

  if (!concours) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'800px',margin:'0 auto',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{fontWeight:900,fontSize:'28px',marginBottom:'12px'}}>Aucun concours en cours</h1>
        <p style={{color:'#6b7280'}}>Revenez bientôt pour le prochain concours MakeGoal !</p>
      </main>
      <Footer />
    </div>
  );

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'15px',boxSizing:'border-box' as const};
  const ferme = concours.statut === 'ferme';

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 24px'}}>

        <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center',marginBottom:'24px'}}>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 8px'}}>🏆 Concours MakeGoal</p>
          <h1 style={{color:'#fff',fontWeight:900,fontSize:'28px',margin:'0 0 12px'}}>{concours.titre}</h1>
          <p style={{color:'#fff',fontSize:'20px',fontWeight:700,margin:'0 0 8px'}}>{concours.equipe1} vs {concours.equipe2}</p>
          <p style={{color:'rgba(255,255,255,0.85)',fontSize:'14px',margin:'0 0 16px'}}>📅 {formatDate(concours.date_match)}</p>
          {concours.lots && (
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'12px',padding:'12px',marginTop:'8px'}}>
              <p style={{color:'#fff',fontSize:'15px',fontWeight:700,margin:0}}>🎁 {concours.lots}</p>
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:'8px',marginBottom:'24px',background:'#f3f4f6',borderRadius:'12px',padding:'4px'}}>
          <button onClick={() => setVue('participer')} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue==='participer'?'#fff':'transparent',color:vue==='participer'?VIOLET:'#6b7280'}}>
            Participer
          </button>
          <button onClick={() => setVue('classement')} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue==='classement'?'#fff':'transparent',color:vue==='classement'?VIOLET:'#6b7280'}}>
            Classement
          </button>
        </div>

        {vue === 'participer' && (
          <>
            {message && <div style={{padding:'12px 16px',borderRadius:'12px',marginBottom:'16px',fontWeight:600,fontSize:'14px',background:message.includes('❌')?'#fef2f2':'#f0fdf4',color:message.includes('❌')?'#ef4444':'#10b981'}}>{message}</div>}{ferme && <div style={{padding:'12px 16px',borderRadius:'12px',marginBottom:'16px',background:'#fef3c7',color:'#92400e',fontWeight:700,fontSize:'14px',textAlign:'center'}}>⏰ Les votes sont fermés pour ce concours.</div>}

            <div style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
              <h3 style={{fontWeight:900,fontSize:'16px',marginBottom:'4px'}}>1. Résultat du match <span style={{color:VIOLET}}>(+10 pts)</span></h3>
              <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>Qui va gagner ?</p>
              <div style={{display:'flex',gap:'8px'}}>
                {[['1',concours.equipe1],['X','Match nul'],['2',concours.equipe2]].map(([val,label]) => (
                  <button key={val} disabled={ferme} onClick={() => setChoix1x2(val)} style={{
                    flex:1,padding:'16px 8px',borderRadius:'12px',cursor:ferme?'default':'pointer',
                    border:choix1x2===val?'2px solid '+VIOLET:'2px solid #e5e7eb',
                    background:choix1x2===val?'#faf5ff':'#fff',
                    fontWeight:700,fontSize:'14px',color:choix1x2===val?VIOLET:'#374151'
                  }}>
                    <div style={{fontSize:'20px',fontWeight:900,marginBottom:'4px'}}>{val}</div>
                    <div style={{fontSize:'12px'}}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
              <h3 style={{fontWeight:900,fontSize:'16px',marginBottom:'4px'}}>2. Score exact <span style={{color:VIOLET}}>(+20 pts)</span></h3>
              <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>Devinez le score final.</p>
              <div style={{display:'flex',gap:'12px',alignItems:'center',justifyContent:'center'}}>
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:'12px',color:'#6b7280',marginBottom:'6px',fontWeight:600}}>{concours.equipe1}</p>
                  <input type="number" min={0} disabled={ferme} value={scoreHome} onChange={e => setScoreHome(e.target.value)} placeholder="0" style={{...inputStyle,width:'70px',textAlign:'center',fontSize:'24px',fontWeight:900}}/>
                </div>
                <span style={{fontSize:'24px',fontWeight:900,color:'#9ca3af',paddingTop:'20px'}}>—</span>
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:'12px',color:'#6b7280',marginBottom:'6px',fontWeight:600}}>{concours.equipe2}</p>
                  <input type="number" min={0} disabled={ferme} value={scoreAway} onChange={e => setScoreAway(e.target.value)} placeholder="0" style={{...inputStyle,width:'70px',textAlign:'center',fontSize:'24px',fontWeight:900}}/>
                </div>
              </div>
            </div>

            <div style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
              <h3 style={{fontWeight:900,fontSize:'16px',marginBottom:'4px'}}>3. Buteurs <span style={{color:VIOLET}}>(+10 pts chacun, +25 si exact)</span></h3>
              <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'16px'}}>Jusqu'à 3 joueurs qui marqueront (à tout moment).</p>
              {buteurs.map((b, i) => (
                <input key={i} disabled={ferme} value={b} onChange={e => setButeurs(buteurs.map((x,j) => j===i?e.target.value:x))} placeholder={'Buteur ' + (i+1)} style={{...inputStyle,marginBottom:'8px'}}/>
              ))}
            </div>

            {!ferme && (
              <button onClick={participer} disabled={saving} style={{width:'100%',padding:'16px',background:VIOLET,color:'#fff',border:'none',borderRadius:'12px',fontWeight:700,fontSize:'16px',cursor:'pointer',marginBottom:'16px'}}>
                {saving ? '...' : (dejaParticipe ? '✏️ Modifier ma participation' : '✅ Valider ma participation')}
              </button>
            )}{dejaParticipe && (
              <div style={{background:'#faf5ff',border:'2px solid '+VIOLET,borderRadius:'16px',padding:'24px',textAlign:'center'}}>
                <h3 style={{fontWeight:900,fontSize:'18px',marginBottom:'8px'}}>🔥 Gagnez 15 points par ami recruté !</h3>
                <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'16px'}}>Partagez votre lien. Chaque personne qui s'inscrit via votre lien vous rapporte 15 points.</p>
                {partageMsg && <p style={{color:'#10b981',fontWeight:700,marginBottom:'12px'}}>{partageMsg}</p>}
                <button onClick={partagerWhatsApp} style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'14px 28px',background:'#25D366',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>
                  📱 Partager mon lien
                </button>
              </div>
            )}

            <p style={{textAlign:'center',marginTop:'24px'}}>
              <a href="/concours/termes" style={{color:VIOLET,fontSize:'14px',fontWeight:600}}>📜 Termes et conditions du concours</a>
            </p>
          </>
        )}

        {vue === 'classement' && (
          <div style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px'}}>
            <h3 style={{fontWeight:900,fontSize:'18px',marginBottom:'4px'}}>🏆 Top 100</h3>
            <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'20px'}}>Le tirage au sort se fera parmi les 100 meilleurs.</p>
            {classement.length === 0 ? (
              <p style={{color:'#9ca3af',textAlign:'center',padding:'20px'}}>Pas encore de participant. Soyez le premier !</p>
            ) : (
              classement.map((c, i) => (
                <div key={c.user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <span style={{
                      fontWeight:900,fontSize:'14px',width:'28px',height:'28px',borderRadius:'999px',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      background:i<3?VIOLET:'#f3f4f6',color:i<3?'#fff':'#6b7280'
                    }}>{i+1}</span>
                    <span style={{fontWeight:600,fontSize:'15px'}}>{c.username}</span>
                  </div>
                  <span style={{fontWeight:900,color:VIOLET,fontSize:'16px'}}>{c.points} pts</span>
                </div>
              ))
            )}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}