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
  statut: string;
  lots: string | null;
};

type ConcoursMatch = {
  id: string;
  equipe1: string;
  equipe2: string;
  date_match: string;
  ordre: number;
  label: string | null;
};

type Prono = {
  choix_1x2: string;
  score_home: string;
  score_away: string;
  buteurs: string[];
};

type Classement = {
  user_id: string;
  username: string;
  points_total: number;
};

export default function ConcoursPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [concours, setConcours] = useState<Concours | null>(null);
  const [matchs, setMatchs] = useState<ConcoursMatch[]>([]);
  const [pronos, setPronos] = useState<Record<string, Prono>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState('');
  const [classement, setClassement] = useState<Classement[]>([]);
  const [partageMsg, setPartageMsg] = useState('');
  const [vue, setVue] = useState<'participer' | 'classement'>('participer');

  useEffect(() => { chargerConcours(); }, []);
  useEffect(() => { if (user && matchs.length > 0) chargerMesPronos(); }, [user, matchs]);

  const chargerConcours = async () => {
    const { data: c } = await supabase
      .from('concours')
      .select('*')
      .in('statut', ['ouvert', 'ferme'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (c) {
      setConcours(c);
      const { data: m } = await supabase
        .from('concours_matchs')
        .select('*')
        .eq('concours_id', c.id)
        .order('ordre', { ascending: true });
      if (m) {
        setMatchs(m);
        const init: Record<string, Prono> = {};
        m.forEach(match => { init[match.id] = { choix_1x2: '', score_home: '', score_away: '', buteurs: ['', '', ''] }; });
        setPronos(init);
      }
      chargerClassement(c.id);
    }
    setLoading(false);
  };

  const chargerMesPronos = async () => {
    if (!user) return;
    const matchIds = matchs.map(m => m.id);
    const { data } = await supabase
      .from('participations_matchs')
      .select('*')
      .eq('user_id', user.id)
      .in('concours_match_id', matchIds);
    if (data) {
      setPronos(prev => {
        const copie = { ...prev };
        data.forEach(p => {
          copie[p.concours_match_id] = {
            choix_1x2: p.choix_1x2 || '',
            score_home: p.score_home?.toString() || '',
            score_away: p.score_away?.toString() || '',
            buteurs: [p.buteurs?.[0] || '', p.buteurs?.[1] || '', p.buteurs?.[2] || '']
          };
        });
        return copie;
      });
    }
  };

  const chargerClassement = async (concoursId: string) => {
    const { data } = await supabase.rpc('classement_concours', { cid: concoursId });
    if (data) setClassement(data);
  };const sauvegarderMatch = async (matchId: string) => {
    if (!user) { router.push('/compte'); return; }
    const p = pronos[matchId];
    if (!p.choix_1x2) { setMessage('❌ Choisissez un résultat (1, X ou 2).'); return; }
    setSaving(matchId); setMessage('');
    const buteursNettoyes = p.buteurs.filter(b => b.trim() !== '');

    // Points immédiats : 10 par critère tenté
    let pointsImmediat = 0;
    if (p.choix_1x2) pointsImmediat += 10;
    if (p.score_home !== '' && p.score_away !== '') pointsImmediat += 10;
    pointsImmediat += buteursNettoyes.length * 10;

    const { error } = await supabase.from('participations_matchs').upsert({
      user_id: user.id,
      concours_match_id: matchId,
      choix_1x2: p.choix_1x2,
      score_home: p.score_home !== '' ? parseInt(p.score_home) : null,
      score_away: p.score_away !== '' ? parseInt(p.score_away) : null,
      buteurs: buteursNettoyes,
      points: pointsImmediat
    }, { onConflict: 'user_id,concours_match_id' });

    setSaving('');
    if (error) {
      setMessage('❌ Erreur : ' + error.message);
    } else {
      setMessage('✅ Pronostic enregistré ! Vous avez déjà ' + pointsImmediat + ' points sur ce match.');
      if (concours) chargerClassement(concours.id);
    }
  };

  const partagerWhatsApp = () => {
    if (!user || !concours) return;
    const lien = 'https://makegoal.vercel.app/compte?ref=' + user.id;
    let texte = '🏆 *MakeGoal — ' + concours.titre + '*\n\n';
    texte += '🎁 À gagner : ' + (concours.lots || '10 000 Gourdes, tablettes, Netflix') + '\n\n';
    texte += '🔥 Rejoins-moi, pronostique et gagne ! Inscris-toi avec mon lien :\n';
    texte += lien + '\n\n';
    texte += '🌐 makegoal.vercel.app';
    window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank');
    setPartageMsg('Lien de parrainage partagé ✓');
    setTimeout(() => setPartageMsg(''), 3000);
  };

  const setChoix = (matchId: string, choix: string) => {
    setPronos(prev => ({ ...prev, [matchId]: { ...prev[matchId], choix_1x2: choix } }));
  };
  const setScore = (matchId: string, cote: 'home' | 'away', val: string) => {
    setPronos(prev => ({ ...prev, [matchId]: { ...prev[matchId], [cote === 'home' ? 'score_home' : 'score_away']: val } }));
  };
  const setButeur = (matchId: string, idx: number, val: string) => {
    setPronos(prev => ({ ...prev, [matchId]: { ...prev[matchId], buteurs: prev[matchId].buteurs.map((b, i) => i === idx ? val : b) } }));
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Port-au-Prince'
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
  const ferme = concours.statut === 'ferme';return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 24px'}}>

        <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center',marginBottom:'24px'}}>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 8px'}}>🏆 Concours MakeGoal</p>
          <h1 style={{color:'#fff',fontWeight:900,fontSize:'28px',margin:'0 0 12px'}}>{concours.titre}</h1>
          {concours.lots && (
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'12px',padding:'12px',marginTop:'8px'}}>
              <p style={{color:'#ffd700',fontSize:'15px',fontWeight:700,margin:0}}>🎁 {concours.lots}</p>
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:'8px',marginBottom:'24px',background:'#f3f4f6',borderRadius:'12px',padding:'4px'}}>
          <button onClick={() => setVue('participer')} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue==='participer'?'#fff':'transparent',color:vue==='participer'?VIOLET:'#6b7280'}}>Participer</button>
          <button onClick={() => setVue('classement')} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue==='classement'?'#fff':'transparent',color:vue==='classement'?VIOLET:'#6b7280'}}>Classement</button>
        </div>

        {message && <div style={{padding:'12px 16px',borderRadius:'12px',marginBottom:'16px',fontWeight:600,fontSize:'14px',background:message.includes('❌')?'#fef2f2':'#f0fdf4',color:message.includes('❌')?'#ef4444':'#10b981'}}>{message}</div>}

        {vue === 'participer' && (
          <>
            {ferme && <div style={{padding:'12px 16px',borderRadius:'12px',marginBottom:'16px',background:'#fef3c7',color:'#92400e',fontWeight:700,fontSize:'14px',textAlign:'center'}}>⏰ Les pronostics sont fermés.</div>}

            {matchs.map(m => {
              const p = pronos[m.id] || { choix_1x2:'', score_home:'', score_away:'', buteurs:['','',''] };
              return (
                <div key={m.id} style={{border:'2px solid #e5e7eb',borderRadius:'20px',padding:'24px',marginBottom:'20px'}}>
                  {m.label && <div style={{display:'inline-block',background:'#111',color:'#fff',fontSize:'11px',fontWeight:700,padding:'4px 12px',borderRadius:'999px',marginBottom:'12px'}}>{m.label}</div>}
                  <h2 style={{fontWeight:900,fontSize:'20px',margin:'0 0 4px'}}>{m.equipe1} vs {m.equipe2}</h2>
                  <p style={{color:'#6b7280',fontSize:'13px',margin:'0 0 20px'}}>📅 {formatDate(m.date_match)}</p>

                  <p style={{fontWeight:700,fontSize:'14px',margin:'0 0 8px'}}>Résultat <span style={{color:VIOLET}}>(10 pts, +25 si exact)</span></p>
                  <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
                    {[['1',m.equipe1],['X','Nul'],['2',m.equipe2]].map(([val,label]) => (
                      <button key={val} disabled={ferme} onClick={() => setChoix(m.id, val)} style={{
                        flex:1,padding:'14px 8px',borderRadius:'12px',cursor:ferme?'default':'pointer',
                        border:p.choix_1x2===val?'2px solid '+VIOLET:'2px solid #e5e7eb',
                        background:p.choix_1x2===val?'#faf5ff':'#fff',
                        fontWeight:700,fontSize:'13px',color:p.choix_1x2===val?VIOLET:'#374151'
                      }}>
                        <div style={{fontSize:'18px',fontWeight:900,marginBottom:'2px'}}>{val}</div>
                        <div style={{fontSize:'11px'}}>{label}</div>
                      </button>
                    ))}
                  </div><p style={{fontWeight:700,fontSize:'14px',margin:'0 0 8px'}}>Score exact <span style={{color:VIOLET}}>(10 pts, +25 si exact)</span></p>
                  <div style={{display:'flex',gap:'12px',alignItems:'center',justifyContent:'center',marginBottom:'20px'}}>
                    <input type="number" min={0} disabled={ferme} value={p.score_home} onChange={e => setScore(m.id,'home',e.target.value)} placeholder="0" style={{...inputStyle,width:'64px',textAlign:'center',fontSize:'22px',fontWeight:900}}/>
                    <span style={{fontSize:'22px',fontWeight:900,color:'#9ca3af'}}>—</span>
                    <input type="number" min={0} disabled={ferme} value={p.score_away} onChange={e => setScore(m.id,'away',e.target.value)} placeholder="0" style={{...inputStyle,width:'64px',textAlign:'center',fontSize:'22px',fontWeight:900}}/>
                  </div>

                  <p style={{fontWeight:700,fontSize:'14px',margin:'0 0 8px'}}>Buteurs <span style={{color:VIOLET}}>(10 pts chacun, +25 si exact)</span></p>
                  {p.buteurs.map((b, i) => (
                    <input key={i} disabled={ferme} value={b} onChange={e => setButeur(m.id, i, e.target.value)} placeholder={'Buteur ' + (i+1)} style={{...inputStyle,marginBottom:'8px'}}/>
                  ))}

                  {!ferme && (
                    <button onClick={() => sauvegarderMatch(m.id)} disabled={saving===m.id} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'12px',fontWeight:700,fontSize:'15px',cursor:'pointer',marginTop:'8px'}}>
                      {saving===m.id ? '...' : '✅ Valider ce match'}
                    </button>
                  )}
                </div>
              );
            })}{user && (
              <div style={{background:'#faf5ff',border:'2px solid '+VIOLET,borderRadius:'16px',padding:'24px',textAlign:'center',marginTop:'8px'}}>
                <h3 style={{fontWeight:900,fontSize:'18px',marginBottom:'8px'}}>🔥 Gagnez 15 points par ami recruté !</h3>
                <p style={{color:'#6b7280',fontSize:'14px',marginBottom:'16px'}}>Partagez votre lien. Chaque personne qui s'inscrit via votre lien vous rapporte 15 points immédiatement.</p>
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
            <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'20px'}}>Le tirage au sort se fera parmi les 100 meilleurs. Points mis à jour en direct.</p>
            {classement.length === 0 ? (
              <p style={{color:'#9ca3af',textAlign:'center',padding:'20px'}}>Pas encore de participant. Soyez le premier !</p>
            ) : (
              classement.map((c, i) => (
                <div key={c.user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <span style={{fontWeight:900,fontSize:'14px',width:'28px',height:'28px',borderRadius:'999px',display:'flex',alignItems:'center',justifyContent:'center',background:i<3?VIOLET:'#f3f4f6',color:i<3?'#fff':'#6b7280'}}>{i+1}</span>
                    <span style={{fontWeight:600,fontSize:'15px'}}>{c.username}</span>
                  </div>
                  <span style={{fontWeight:900,color:VIOLET,fontSize:'16px'}}>{c.points_total} pts</span>
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