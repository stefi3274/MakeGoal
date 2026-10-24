'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getSport, Sport } from '../../lib/sport';

const COULEUR = '#eab308';

type Question = {
  id: string;
  question: string;
  options: { cle: string; texte: string }[];
  statut: string;
  sport: string | null;
  date_fermeture: string | null;
};

type Resultat = { bonneReponse: string; gagnants: string[] };

const formatChrono = (ms: number) => {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

export default function QuestionEclairPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sport, setSportLocal] = useState<Sport>('football');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dejaRepondu, setDejaRepondu] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState('');
  const [reponsesPerso, setReponsesPerso] = useState<Record<string, boolean>>({});
  const [resultats, setResultats] = useState<Record<string, Resultat>>({});
  const [maintenant, setMaintenant] = useState(Date.now());
  const [message, setMessage] = useState('');
  const declencheursEnvoyes = useRef<Set<string>>(new Set());

  useEffect(() => { setSportLocal(getSport()); }, []);
  useEffect(() => { charger(); }, [sport]);

  // Horloge locale, mise à jour chaque seconde pour le chrono
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Dès qu'un chrono atteint zéro, on déclenche la fermeture/tirage automatique
  // (le serveur revérifie lui-même l'heure réelle avant d'agir).
  useEffect(() => {
    questions.forEach(q => {
      if (q.statut === 'ouverte' && q.date_fermeture) {
        const reste = new Date(q.date_fermeture).getTime() - maintenant;
        if (reste <= 0 && !declencheursEnvoyes.current.has(q.id)) {
          declencheursEnvoyes.current.add(q.id);
          declencherFermetureAuto(q.id);
        }
      }
    });
  }, [maintenant, questions]);

  const charger = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('questions_eclair')
      .select('id, question, options, statut, sport, date_fermeture')
      .in('statut', ['ouverte', 'fermee', 'tiree'])
      .eq('sport', sport)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) {
      setQuestions(data);
      data.filter(q => q.statut === 'tiree').forEach(q => chargerResultat(q.id));
    }

    if (user && data && data.length > 0) {
      const { data: reponses } = await supabase
        .from('reponses_eclair')
        .select('question_id')
        .eq('user_id', user.id)
        .in('question_id', data.map(q => q.id));
      if (reponses) {
        const map: Record<string, boolean> = {};
        reponses.forEach(r => { map[r.question_id] = true; });
        setDejaRepondu(map);
      }
    }
    setLoading(false);
  };

  const chargerResultat = async (questionId: string) => {
    const res = await fetch('/api/question-eclair-resultats?questionId=' + questionId);
    const data = await res.json();
    if (data.termine) {
      setResultats(prev => ({ ...prev, [questionId]: { bonneReponse: data.bonneReponse, gagnants: data.gagnants } }));
    }
  };

  const declencherFermetureAuto = async (questionId: string) => {
    const res = await fetch('/api/question-eclair-tirage-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId })
    });
    const data = await res.json();
    if (res.ok) {
      // Recharge pour refléter le nouveau statut et afficher les résultats
      charger();
    }
  };

  const repondre = async (questionId: string, reponse: string) => {
    if (!user) { router.push('/compte'); return; }
    setEnvoiEnCours(questionId); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setEnvoiEnCours(''); setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/question-eclair-repondre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ questionId, reponse })
    });
    const data = await res.json();
    setEnvoiEnCours('');
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setDejaRepondu(prev => ({ ...prev, [questionId]: true }));
    setReponsesPerso(prev => ({ ...prev, [questionId]: data.correcte }));
    setMessage(data.correcte ? '✅ Bonne réponse enregistrée ! Rendez-vous à la fermeture pour le tirage.' : '👍 Réponse enregistrée. Ce n\'était pas la bonne, tentez la prochaine !');
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#78350f,'+COULEUR+')',padding:'40px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(26px,5vw,40px)',margin:'0 0 8px'}}>⚡ Question Éclair</h1>
        <p style={{color:'rgba(255,255,255,0.9)',fontSize:'16px',margin:0}}>Répondez juste avant la fin du chrono : 10 gagnants tirés au sort, +15 points chacun.</p>
      </div>

      <main style={{maxWidth:'700px',margin:'0 auto',padding:'32px 16px'}}>
        {message && <div style={{padding:'12px 16px',borderRadius:'12px',marginBottom:'20px',fontWeight:600,fontSize:'14px',background:message.includes('❌')?'#fef2f2':'#fffbeb',color:message.includes('❌')?'#ef4444':'#92400e'}}>{message}</div>}

        {loading && <p style={{color:'#9ca3af',textAlign:'center'}}>Chargement…</p>}

        {!loading && questions.length === 0 && (
          <div style={{background:'#f9fafb',padding:'40px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Aucune Question Éclair pour le moment. Revenez bientôt !</p>
          </div>
        )}

        {questions.map(q => {
          const repondu = dejaRepondu[q.id];
          const resultat = resultats[q.id];
          const reste = q.date_fermeture ? new Date(q.date_fermeture).getTime() - maintenant : null;
          const encoreOuverte = q.statut === 'ouverte' && (reste === null || reste > 0);

          return (
            <div key={q.id} style={{border:'2px solid ' + (encoreOuverte ? '#fde68a' : '#e5e7eb'), borderRadius:'20px', padding:'24px', marginBottom:'20px', opacity: encoreOuverte ? 1 : 0.9}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',marginBottom:'16px'}}>
                <h2 style={{fontWeight:900,fontSize:'19px',margin:0}}>{q.question}</h2>
                {encoreOuverte && reste !== null && (
                  <div style={{flexShrink:0,textAlign:'center',background:'#78350f',color:'#fff',borderRadius:'12px',padding:'8px 12px'}}>
                    <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',opacity:0.8}}>Temps restant</div>
                    <div style={{fontSize:'16px',fontWeight:900,fontFamily:'monospace'}}>{formatChrono(reste)}</div>
                  </div>
                )}
              </div>

              {!encoreOuverte && !resultat && (
                <div style={{textAlign:'center',padding:'16px',background:'#fffbeb',borderRadius:'12px'}}>
                  <p style={{margin:0,fontWeight:700,color:'#92400e'}}>⏳ Chrono écoulé, tirage en cours...</p>
                </div>
              )}

              {resultat && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'12px',padding:'16px',marginBottom:repondu?'0':'16px'}}>
                  <p style={{fontWeight:900,fontSize:'14px',color:'#065f46',margin:'0 0 8px'}}>✅ Bonne réponse : {resultat.bonneReponse}</p>
                  {resultat.gagnants.length > 0 ? (
                    <>
                      <p style={{fontSize:'12px',color:'#065f46',fontWeight:700,margin:'0 0 6px'}}>🎉 Gagnants du tirage (+15 points) :</p>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                        {resultat.gagnants.map((nom, i) => (
                          <span key={i} style={{fontSize:'12px',fontWeight:700,background:'#065f46',color:'#fff',padding:'4px 10px',borderRadius:'999px'}}>🏆 {nom}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p style={{fontSize:'12px',color:'#6b7280',margin:0}}>Personne n'avait la bonne réponse cette fois.</p>
                  )}
                </div>
              )}

              {encoreOuverte && (
                repondu ? (
                  <div style={{textAlign:'center',padding:'16px',background:reponsesPerso[q.id]?'#f0fdf4':'#f9fafb',borderRadius:'12px'}}>
                    <p style={{margin:0,fontWeight:700,color:reponsesPerso[q.id]?'#10b981':'#6b7280'}}>
                      {reponsesPerso[q.id] ? '✅ Vous avez déjà répondu correctement !' : '👍 Vous avez déjà répondu à cette question.'}
                    </p>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {q.options.map(o => (
                      <button key={o.cle} disabled={envoiEnCours===q.id} onClick={() => repondre(q.id, o.cle)} style={{
                        textAlign:'left', padding:'14px 18px', borderRadius:'12px', cursor:'pointer',
                        border:'2px solid #e5e7eb', background:'#fff', fontWeight:700, fontSize:'14px', color:'#374151'
                      }}>
                        <span style={{color:COULEUR,fontWeight:900,marginRight:'8px'}}>{o.cle}.</span>{o.texte}
                      </button>
                    ))}
                    {!user && <p style={{fontSize:'12px',color:'#9ca3af',textAlign:'center',margin:'4px 0 0'}}>Connectez-vous pour répondre et tenter le tirage.</p>}
                  </div>
                )
              )}
            </div>
          );
        })}
      </main>
      <Footer />
    </div>
  );
}
