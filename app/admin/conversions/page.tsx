'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type ConversionAvecUser = {
  id: string;
  user_id: string;
  points_convertis: number;
  montant_gourdes: number;
  statut: string;
  demande_at: string;
  traite_at: string | null;
  nom?: string;
};

export default function AdminConversions() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [conversions, setConversions] = useState<ConversionAvecUser[]>([]);
  const [message, setMessage] = useState('');
  const [filtre, setFiltre] = useState<'en_attente' | 'toutes'>('en_attente');
  const [traitementEnCours, setTraitementEnCours] = useState('');

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerConversions(); }, [connecte, filtre]);

  const chargerConversions = async () => {
    let requete = supabase.from('conversions').select('*').order('demande_at', { ascending: false });
    if (filtre === 'en_attente') requete = requete.eq('statut', 'en_attente');
    const { data } = await requete;
    if (!data) { setConversions([]); return; }

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setConversions(data); return; }

    const avecNoms = await Promise.all(data.map(async (c) => {
      try {
        const res = await fetch('/api/utilisateur-nom?userId=' + c.user_id, { headers: { 'Authorization': 'Bearer ' + token } });
        const d = await res.json();
        return { ...c, nom: d.nom || c.user_id.slice(0, 8) };
      } catch { return { ...c, nom: c.user_id.slice(0, 8) }; }
    }));
    setConversions(avecNoms);
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };

  const traiter = async (conversionId: string, statut: 'payee' | 'refusee') => {
    const libelle = statut === 'payee' ? 'marquer comme payée' : 'refuser';
    if (!confirm('Confirmer : ' + libelle + ' cette demande ?')) return;
    setTraitementEnCours(conversionId);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setTraitementEnCours(''); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/conversion-traiter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ conversionId, statut })
    });
    const data = await res.json();
    setTraitementEnCours('');
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setMessage('✅ Demande mise à jour.');
    chargerConversions();
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Port-au-Prince' });
  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Conversions</h1>
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
        <h1 style={{color:'#10b981',fontWeight:900,fontSize:'18px',margin:0}}>💰 Conversions</h1>
        <div style={{display:'flex',gap:'6px',background:'#1a1a1a',borderRadius:'999px',padding:'4px'}}>
          <button onClick={() => setFiltre('en_attente')} style={{border:'none',cursor:'pointer',padding:'7px 14px',borderRadius:'999px',fontWeight:800,fontSize:'12.5px',background:filtre==='en_attente'?'#f59e0b':'transparent',color:filtre==='en_attente'?'#fff':'#9ca3af'}}>⏳ En attente</button>
          <button onClick={() => setFiltre('toutes')} style={{border:'none',cursor:'pointer',padding:'7px 14px',borderRadius:'999px',fontWeight:800,fontSize:'12.5px',background:filtre==='toutes'?VIOLET:'transparent',color:filtre==='toutes'?'#fff':'#9ca3af'}}>Toutes</button>
        </div>
        <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
        {conversions.length === 0 && <p style={{color:'#6b7280'}}>Aucune demande {filtre === 'en_attente' ? 'en attente' : ''} pour le moment.</p>}
        {conversions.map(c => (
          <div key={c.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px',marginBottom:'12px'}}>
              <div>
                <p style={{color:'#fff',fontWeight:900,fontSize:'16px',margin:'0 0 4px'}}>{c.nom || c.user_id.slice(0,8)}</p>
                <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>Demandé le {formatDate(c.demande_at)}</p>
              </div>
              <span style={{fontSize:'11px',padding:'4px 12px',borderRadius:'999px',fontWeight:700,background:c.statut==='en_attente'?'#f59e0b':c.statut==='payee'?'#10b981':'#ef4444',color:'#fff'}}>
                {c.statut === 'en_attente' ? 'En attente' : c.statut === 'payee' ? '✓ Payée' : '✕ Refusée'}
              </span>
            </div>
            <div style={{background:'#222',borderRadius:'10px',padding:'14px',marginBottom:c.statut==='en_attente'?'14px':0,display:'flex',gap:'20px',flexWrap:'wrap'}}>
              <div><p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 2px'}}>Points convertis</p><p style={{color:'#fff',fontWeight:900,fontSize:'18px',margin:0}}>{c.points_convertis.toLocaleString('fr-FR')}</p></div>
              <div><p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 2px'}}>À payer</p><p style={{color:'#10b981',fontWeight:900,fontSize:'18px',margin:0}}>{c.montant_gourdes.toLocaleString('fr-FR')} Gourdes</p></div>
            </div>
            {c.statut === 'en_attente' && (
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => traiter(c.id, 'payee')} disabled={traitementEnCours===c.id} style={{flex:1,padding:'10px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:'#10b981',color:'#fff'}}>{traitementEnCours===c.id ? '⏳...' : '✓ Marquer payée'}</button>
                <button onClick={() => traiter(c.id, 'refusee')} disabled={traitementEnCours===c.id} style={{padding:'10px 16px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>✕ Refuser</button>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
