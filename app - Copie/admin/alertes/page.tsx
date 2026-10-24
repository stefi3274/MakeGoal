'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type Alerte = { id: string; source: string; message: string; niveau: string; created_at: string };

export default function AdminAlertes() {
  const [connecte, setConnecte] = useState(false);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [dernierCronOk, setDernierCronOk] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) charger(); }, [connecte]);

  const charger = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/alertes', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setAlertes(data.alertes);
    setDernierCronOk(data.dernierCronOk);
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Port-au-Prince' });

  const heuresDepuisCron = dernierCronOk ? (Date.now() - new Date(dernierCronOk).getTime()) / 3600000 : null;
  const cronEnPanne = heuresDepuisCron === null || heuresDepuisCron > 30; // le cron tourne 1x/jour, +30h = suspect

  if (!connecte) {
    return <AdminAuth titre="Admin Alertes" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>🚨 Alertes système</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={charger} style={{background:'#10b981',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>🔄 Actualiser</button>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:'#7f1d1d',color:'#fca5a5',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        <div style={{background: cronEnPanne ? '#7f1d1d' : '#064e3b', borderRadius:'14px', padding:'18px', marginBottom:'24px'}}>
          <p style={{color: cronEnPanne ? '#fca5a5' : '#6ee7b7', fontWeight:900, fontSize:'14px', margin:0}}>
            {cronEnPanne ? '🔴 Cron peut-être en panne' : '🟢 Cron en bonne santé'}
          </p>
          <p style={{color: cronEnPanne ? '#fca5a5' : '#6ee7b7', fontSize:'12px', margin:'6px 0 0'}}>
            {dernierCronOk ? 'Dernier passage : ' + formatDate(dernierCronOk) : 'Aucun passage enregistré pour le moment.'}
          </p>
        </div>

        <h3 style={{color:'#fff',fontWeight:900,fontSize:'16px',marginBottom:'12px'}}>Historique (50 dernières)</h3>
        {alertes.length === 0 && <p style={{color:'#6b7280'}}>Aucune alerte enregistrée.</p>}
        {alertes.map(a => (
          <div key={a.id} style={{background:'#1a1a1a',border:'1px solid '+(a.niveau==='erreur'?'#7f1d1d':'#333'),borderRadius:'10px',padding:'14px',marginBottom:'8px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
              <span style={{fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'999px',background:a.niveau==='erreur'?'#7f1d1d':'#374151',color:a.niveau==='erreur'?'#fca5a5':'#9ca3af'}}>{a.niveau==='erreur'?'❌ Erreur':'ℹ️ Info'}</span>
              <span style={{fontSize:'11px',color:'#6b7280'}}>{formatDate(a.created_at)}</span>
            </div>
            <p style={{color:'#fff',fontSize:'13px',margin:'4px 0 0'}}>{a.message}</p>
            <p style={{color:'#6b7280',fontSize:'11px',margin:'4px 0 0'}}>Source : {a.source}</p>
          </div>
        ))}

      </main>
    </div>
  );
}
