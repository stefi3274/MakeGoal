'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type RetraitAvecUser = {
  id: string; user_id: string; montant: number; statut: string;
  demande_at: string; traite_at: string | null; nom?: string;
};

export default function AdminParisRetraits() {
  const [connecte, setConnecte] = useState(false);
  const [retraits, setRetraits] = useState<RetraitAvecUser[]>([]);
  const [message, setMessage] = useState('');
  const [filtre, setFiltre] = useState<'en_attente' | 'toutes'>('en_attente');
  const [traitementEnCours, setTraitementEnCours] = useState('');

  const [octroiEmail, setOctroiEmail] = useState('');
  const [octroiMontant, setOctroiMontant] = useState('1000');
  const [octroiEnCours, setOctroiEnCours] = useState(false);

  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) chargerRetraits(); }, [connecte, filtre]);

  const chargerRetraits = async () => {
    let requete = supabase.from('paris_retraits').select('*').order('demande_at', { ascending: false });
    if (filtre === 'en_attente') requete = requete.eq('statut', 'en_attente');
    const { data } = await requete;
    if (!data) { setRetraits([]); return; }

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setRetraits(data); return; }

    const avecNoms = await Promise.all(data.map(async (r) => {
      try {
        const res = await fetch('/api/utilisateur-nom?userId=' + r.user_id, { headers: { 'Authorization': 'Bearer ' + token } });
        const d = await res.json();
        return { ...r, nom: d.nom || r.user_id.slice(0, 8) };
      } catch { return { ...r, nom: r.user_id.slice(0, 8) }; }
    }));
    setRetraits(avecNoms);
  };

  const traiter = async (retraitId: string, statut: 'payee' | 'refusee') => {
    if (!confirm('Confirmer : ' + (statut === 'payee' ? 'marquer comme payée' : 'refuser') + ' cette demande ?')) return;
    setTraitementEnCours(retraitId);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setTraitementEnCours(''); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/paris-retrait-traiter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ retraitId, statut })
    });
    const data = await res.json();
    setTraitementEnCours('');
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setMessage('✅ Demande mise à jour.');
    chargerRetraits();
  };

  const octroyer = async () => {
    if (!octroiEmail || !octroiMontant) { setMessage('❌ Email et montant obligatoires.'); return; }
    setOctroiEnCours(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setOctroiEnCours(false); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/paris-octroyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ email: octroiEmail, montant: parseFloat(octroiMontant) })
    });
    const data = await res.json();
    setOctroiEnCours(false);
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setMessage('✅ ' + octroiMontant + ' Gourdes octroyées à ' + octroiEmail + ' (nouveau solde : ' + data.nouveauSolde + ' G).');
    setOctroiEmail(''); setOctroiMontant('1000');
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Port-au-Prince' });
  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};

  if (!connecte) {
    return <AdminAuth titre="Admin Paris" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:'#bf00ff',fontWeight:900,fontSize:'18px',margin:0}}>🎲 Admin Paris</h1>
        <div style={{display:'flex',gap:'6px',background:'#1a1a1a',borderRadius:'999px',padding:'4px'}}>
          <button onClick={() => setFiltre('en_attente')} style={{border:'none',cursor:'pointer',padding:'7px 14px',borderRadius:'999px',fontWeight:800,fontSize:'12.5px',background:filtre==='en_attente'?'#f59e0b':'transparent',color:filtre==='en_attente'?'#fff':'#9ca3af'}}>⏳ En attente</button>
          <button onClick={() => setFiltre('toutes')} style={{border:'none',cursor:'pointer',padding:'7px 14px',borderRadius:'999px',fontWeight:800,fontSize:'12.5px',background:filtre==='toutes'?VIOLET:'transparent',color:filtre==='toutes'?'#fff':'#9ca3af'}}>Toutes</button>
        </div>
        <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'24px'}}>
          <h3 style={{color:'#fff',fontWeight:900,fontSize:'15px',margin:'0 0 4px'}}>🎁 Octroyer des Gourdes manuellement</h3>
          <p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 12px'}}>En attendant le futur système de récompenses par publicité.</p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <input type="email" value={octroiEmail} onChange={e => setOctroiEmail(e.target.value)} placeholder="Email du compte" style={{...inputStyle,flex:2,minWidth:'180px'}}/>
            <input type="number" value={octroiMontant} onChange={e => setOctroiMontant(e.target.value)} placeholder="Montant" style={{...inputStyle,flex:1,minWidth:'100px'}}/>
            <button onClick={octroyer} disabled={octroiEnCours} style={{padding:'12px 20px',background:'#10b981',color:'#fff',border:'none',borderRadius:'8px',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>{octroiEnCours ? '⏳...' : '+ Octroyer'}</button>
          </div>
        </div>

        <h3 style={{color:'#fff',fontWeight:900,fontSize:'16px',marginBottom:'12px'}}>Demandes de retrait</h3>
        {retraits.length === 0 && <p style={{color:'#6b7280'}}>Aucune demande {filtre === 'en_attente' ? 'en attente' : ''} pour le moment.</p>}
        {retraits.map(r => (
          <div key={r.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px',marginBottom:'12px'}}>
              <div>
                <p style={{color:'#fff',fontWeight:900,fontSize:'16px',margin:'0 0 4px'}}>{r.nom || r.user_id.slice(0,8)}</p>
                <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>Demandé le {formatDate(r.demande_at)}</p>
              </div>
              <span style={{fontSize:'11px',padding:'4px 12px',borderRadius:'999px',fontWeight:700,background:r.statut==='en_attente'?'#f59e0b':r.statut==='payee'?'#10b981':'#ef4444',color:'#fff'}}>
                {r.statut === 'en_attente' ? 'En attente' : r.statut === 'payee' ? '✓ Payée' : '✕ Refusée'}
              </span>
            </div>
            <p style={{color:'#10b981',fontWeight:900,fontSize:'20px',margin:'0 0 14px'}}>{r.montant.toLocaleString('fr-FR')} Gourdes</p>
            {r.statut === 'en_attente' && (
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => traiter(r.id, 'payee')} disabled={traitementEnCours===r.id} style={{flex:1,padding:'10px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:'#10b981',color:'#fff'}}>{traitementEnCours===r.id ? '⏳...' : '✓ Marquer payée'}</button>
                <button onClick={() => traiter(r.id, 'refusee')} disabled={traitementEnCours===r.id} style={{padding:'10px 16px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>✕ Refuser</button>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
