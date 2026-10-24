'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type Groupe = { ip: string; comptes: { nom: string; createdAt: string }[] };

export default function AdminComptesSuspects() {
  const [connecte, setConnecte] = useState(false);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);

  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) charger(); }, [connecte]);

  const charger = async () => {
    setChargement(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setChargement(false); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/comptes-suspects', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    setChargement(false);
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setGroupes(data.groupes);
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Port-au-Prince' });

  if (!connecte) {
    return <AdminAuth titre="Comptes suspects" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>🕵️ Comptes suspects</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={charger} disabled={chargement} style={{background:'#10b981',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>{chargement ? '⏳...' : '🔄 Actualiser'}</button>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:'#7f1d1d',color:'#fca5a5',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
        <p style={{color:'#6b7280',fontSize:'13px',marginBottom:'20px',lineHeight:'1.6'}}>
          Liste des adresses IP utilisées pour créer <strong>plusieurs comptes différents</strong>. Ce n'est pas une preuve automatique de fraude (une même famille ou un même café internet peut légitimement partager une IP), mais ça mérite un coup d'œil avant d'approuver un gros retrait.
        </p>

        {groupes.length === 0 && <p style={{color:'#6b7280'}}>Aucune IP partagée détectée pour le moment. Bon signe.</p>}

        {groupes.map(g => (
          <div key={g.ip} style={{background:'#1a1a1a',border:'1px solid #f59e0b',borderRadius:'14px',padding:'18px',marginBottom:'16px'}}>
            <p style={{color:'#f59e0b',fontWeight:900,fontSize:'14px',margin:'0 0 4px'}}>⚠️ {g.comptes.length} comptes depuis la même adresse IP</p>
            <p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 12px',fontFamily:'monospace'}}>{g.ip}</p>
            {g.comptes.map((c, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:i>0?'1px solid #333':'none'}}>
                <span style={{color:'#fff',fontSize:'13px',fontWeight:700}}>{c.nom}</span>
                <span style={{color:'#6b7280',fontSize:'12px'}}>{formatDate(c.createdAt)}</span>
              </div>
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}
