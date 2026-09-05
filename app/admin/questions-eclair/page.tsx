'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../../lib/sport';

const VIOLET = '#bf00ff';

type Question = {
  id: string;
  question: string;
  options: { cle: string; texte: string }[];
  bonne_reponse: string;
  statut: string;
  sport: string | null;
  created_at: string;
  date_fermeture: string | null;
};

export default function AdminQuestionsEclair() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reponsesParQuestion, setReponsesParQuestion] = useState<Record<string, { total: number; correctes: number }>>({});
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');
  const [sportForm, setSportForm] = useState<Sport>('football');

  const [texteQuestion, setTexteQuestion] = useState('');
  const [options, setOptions] = useState([{ cle: 'A', texte: '' }, { cle: 'B', texte: '' }, { cle: 'C', texte: '' }, { cle: 'D', texte: '' }]);
  const [bonneReponse, setBonneReponse] = useState('A');
  const [dureeHeures, setDureeHeures] = useState(12);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [tirageEnCours, setTirageEnCours] = useState('');

  useEffect(() => { setSportForm(getSport()); }, []);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerQuestions(); }, [connecte]);

  const chargerQuestions = async () => {
    const { data } = await supabase.from('questions_eclair').select('*').order('created_at', { ascending: false });
    if (data) {
      setQuestions(data);
      data.forEach(q => chargerStatsReponses(q.id));
    }
  };

  const chargerStatsReponses = async (questionId: string) => {
    const { data } = await supabase.from('reponses_eclair').select('correcte').eq('question_id', questionId);
    if (data) {
      setReponsesParQuestion(prev => ({
        ...prev,
        [questionId]: { total: data.length, correctes: data.filter(r => r.correcte).length }
      }));
    }
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };

  const modifierOption = (i: number, texte: string) => setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, texte } : o));

  const creerQuestion = async () => {
    const optionsRemplies = options.filter(o => o.texte.trim());
    if (!texteQuestion.trim() || optionsRemplies.length < 2) { setMessage('❌ La question et au moins 2 options sont obligatoires.'); return; }
    if (!optionsRemplies.some(o => o.cle === bonneReponse)) { setMessage('❌ La bonne réponse doit correspondre à une option remplie.'); return; }
    setCreationEnCours(true);
    const { error } = await supabase.from('questions_eclair').insert({
      question: texteQuestion, options: optionsRemplies, bonne_reponse: bonneReponse, statut: 'ouverte', sport: sportForm,
      date_fermeture: new Date(Date.now() + dureeHeures * 3600 * 1000).toISOString()
    });
    setCreationEnCours(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Question Éclair publiée !');
    setTexteQuestion(''); setOptions([{ cle: 'A', texte: '' }, { cle: 'B', texte: '' }, { cle: 'C', texte: '' }, { cle: 'D', texte: '' }]); setBonneReponse('A');
    chargerQuestions();
    setTimeout(() => setVue('liste'), 1200);
  };

  const declencherTirage = async (questionId: string) => {
    if (!confirm('Fermer cette question et tirer au sort les gagnants maintenant ? Cette action est définitive.')) return;
    setTirageEnCours(questionId);
    setMessage('⏳ Tirage en cours...');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setTirageEnCours(''); setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/question-eclair-tirage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ questionId })
    });
    const data = await res.json();
    setTirageEnCours('');
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setMessage('✅ Tirage effectué : ' + data.nombreGagnants + ' gagnant(s) ont reçu 15 points.');
    chargerQuestions();
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px'};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Questions Éclair</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{...inputStyle,marginBottom:'12px'}}/>
          <div style={{position:'relative'}}>
            <input type={voirMdp ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{...inputStyle,paddingRight:'44px',marginBottom:'16px'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
            <button type="button" onClick={() => setVoirMdp(v => !v)} style={{position:'absolute',right:'8px',top:'18px',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>{voirMdp ? '🙈' : '👁️'}</button>
          </div>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:'#eab308',fontWeight:900,fontSize:'18px',margin:0}}>⚡ Questions Éclair</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={() => setVue('nouveau')} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>Nouvelle Question Éclair</h2>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              {(['football','basketball'] as Sport[]).map(s => (
                <button key={s} type="button" onClick={() => setSportForm(s)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:sportForm===s?SPORT_COULEURS[s].primaire:'#333',color:'#fff'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
              ))}
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>La question</label>
              <textarea value={texteQuestion} onChange={e => setTexteQuestion(e.target.value)} rows={2} placeholder="Combien de Ballons d'or Messi a-t-il gagnés ?" style={{...inputStyle,resize:'vertical'}}/>
            </div>
            <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Options (2 à 4, laissez vide celles non utilisées)</p>
            {options.map((o, i) => (
              <div key={o.cle} style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
                <span style={{width:'24px',color:'#9ca3af',fontWeight:900,fontSize:'13px'}}>{o.cle}</span>
                <input value={o.texte} onChange={e => modifierOption(i, e.target.value)} placeholder={'Option ' + o.cle} style={inputStyle}/>
                <input type="radio" name="bonneReponse" checked={bonneReponse === o.cle} onChange={() => setBonneReponse(o.cle)} title="Bonne réponse" style={{width:'20px',height:'20px',flexShrink:0}}/>
              </div>
            ))}
            <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 8px'}}>Cochez le rond à droite de la bonne réponse.</p>

            <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Durée avant fermeture automatique et tirage</p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'20px'}}>
              {[1, 6, 12, 24, 48].map(h => (
                <button key={h} type="button" onClick={() => setDureeHeures(h)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:dureeHeures===h?'#eab308':'#333',color:dureeHeures===h?'#111':'#fff'}}>{h < 24 ? h + 'h' : (h/24) + 'j'}</button>
              ))}
            </div>
            <button onClick={creerQuestion} disabled={creationEnCours} style={{width:'100%',padding:'14px',background:'#eab308',color:'#111',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{creationEnCours ? '⏳...' : '⚡ Publier la question'}</button>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {questions.length === 0 && <p style={{color:'#6b7280'}}>Aucune Question Éclair pour le moment.</p>}
            {questions.map(q => {
              const stats = reponsesParQuestion[q.id] || { total: 0, correctes: 0 };
              return (
                <div key={q.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                    <div>
                      <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'999px',fontWeight:700,background:q.statut==='ouverte'?'#10b981':q.statut==='fermee'?'#f59e0b':'#6b7280',color:'#fff'}}>
                        {q.statut === 'ouverte' ? '🟢 Ouverte' : q.statut === 'fermee' ? '🟡 Fermée' : '✓ Tirée'}
                      </span>
                      <p style={{color:'#fff',fontWeight:700,fontSize:'15px',margin:'8px 0 4px'}}>{q.question}</p>
                      <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>Bonne réponse : {q.bonne_reponse} · {stats.total} réponse(s), dont {stats.correctes} correcte(s)</p>
                      {q.date_fermeture && q.statut === 'ouverte' && <p style={{color:'#eab308',fontSize:'11px',margin:'4px 0 0',fontWeight:700}}>⏱️ Ferme le {new Date(q.date_fermeture).toLocaleString('fr-FR',{timeZone:'America/Port-au-Prince',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
                    {q.options.map(o => (
                      <span key={o.cle} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'999px',background:o.cle===q.bonne_reponse?'#065f46':'#222',color:o.cle===q.bonne_reponse?'#6ee7b7':'#9ca3af',fontWeight:o.cle===q.bonne_reponse?700:400}}>{o.cle}. {o.texte}</span>
                    ))}
                  </div>
                  {q.statut !== 'tiree' && (
                    <button onClick={() => declencherTirage(q.id)} disabled={tirageEnCours===q.id} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#eab308',color:'#111'}}>{tirageEnCours===q.id ? '⏳...' : '🎲 Clôturer et tirer au sort (10 gagnants, +15 pts)'}</button>
                  )}
                </div>
              );
            })}
          </>
        )}

      </main>
    </div>
  );
}
