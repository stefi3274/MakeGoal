'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type Debat = {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string | null;
  option4: string | null;
  actif: boolean;
  created_at: string;
};

export default function AdminDebats() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [debats, setDebats] = useState<Debat[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');

  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerDebats(); }, [connecte]);

  const chargerDebats = async () => {
    const { data } = await supabase.from('debats').select('*').order('created_at', { ascending: false });
    if (data) setDebats(data);
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };

  const creer = async () => {
    if (!question || !option1 || !option2) { setMessage('❌ Question et 2 options minimum.'); return; }
    const { error } = await supabase.from('debats').insert({
      question, option1, option2,
      option3: option3 || null, option4: option4 || null,
      actif: false
    });
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Débat créé ! Activez-le pour l\'afficher.');
    setQuestion(''); setOption1(''); setOption2(''); setOption3(''); setOption4('');
    chargerDebats();
    setTimeout(() => setVue('liste'), 1200);
  };

  const activer = async (d: Debat) => {
    // Désactiver tous les autres, activer celui-ci
    await supabase.from('debats').update({ actif: false }).neq('id', d.id);
    await supabase.from('debats').update({ actif: !d.actif }).eq('id', d.id);
    chargerDebats();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce débat et ses votes ?')) return;
    await supabase.from('debat_votes').delete().eq('debat_id', id);
    await supabase.from('debats').delete().eq('id', id);
    chargerDebats();
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px'};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Débats</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}/>
          <div style={{position:'relative'}}>
            <input type={voirMdp ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{width:'100%',padding:'12px',paddingRight:'44px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
            <button type="button" onClick={() => setVoirMdp(v => !v)} style={{position:'absolute',right:'8px',top:'18px',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>{voirMdp ? '🙈' : '👁️'}</button>
          </div>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>💬 Admin Débats</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={() => setVue('nouveau')} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'700px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>Nouveau débat</h2>
            <div style={{marginBottom:'16px'}}><label style={labelStyle}>Question *</label><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Mbappé ou Yamal, qui est le meilleur ?" style={inputStyle}/></div>
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Option 1 *</label><input value={option1} onChange={e => setOption1(e.target.value)} placeholder="Mbappé" style={inputStyle}/></div>
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Option 2 *</label><input value={option2} onChange={e => setOption2(e.target.value)} placeholder="Yamal" style={inputStyle}/></div>
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Option 3 (optionnel)</label><input value={option3} onChange={e => setOption3(e.target.value)} placeholder="Laisser vide si non utilisé" style={inputStyle}/></div>
            <div style={{marginBottom:'20px'}}><label style={labelStyle}>Option 4 (optionnel)</label><input value={option4} onChange={e => setOption4(e.target.value)} placeholder="Laisser vide si non utilisé" style={inputStyle}/></div>
            <button onClick={creer} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>Créer le débat</button>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {debats.length === 0 && <p style={{color:'#6b7280'}}>Aucun débat. Créez-en un.</p>}
            {debats.map(d => (
              <div key={d.id} style={{background:'#1a1a1a',border:d.actif?'2px solid '+VIOLET:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px',gap:'8px'}}>
                  <h3 style={{color:'#fff',fontWeight:900,fontSize:'16px',margin:0,flex:1}}>{d.question}</h3>
                  {d.actif && <span style={{fontSize:'10px',background:VIOLET,color:'#fff',padding:'3px 10px',borderRadius:'999px',fontWeight:700,whiteSpace:'nowrap'}}>● EN LIGNE</span>}
                </div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
                  {[d.option1, d.option2, d.option3, d.option4].filter(Boolean).map((o, i) => (
                    <span key={i} style={{fontSize:'12px',background:'#222',color:'#9ca3af',padding:'4px 12px',borderRadius:'999px'}}>{o}</span>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button onClick={() => activer(d)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:d.actif?'#f59e0b':'#10b981',color:'#fff'}}>{d.actif ? 'Désactiver' : 'Activer'}</button>
                  <button onClick={() => supprimer(d.id)} style={{padding:'8px 16px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>🗑️</button>
                </div>
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  );
}
