'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type Donnees = {
  points: { totalEnCirculation: number; expositionGourdes: number; nombreComptes: number };
  paris: { totalSoldeVirtuel: number; comptesEligiblesRetrait: number; expositionMaxGourdes: number; nombreComptes: number };
  obligationImmediate: { conversions: number; retraits: number; total: number };
  expositionTotaleMax: number;
};

export default function AdminSolvabilite() {
  const [connecte, setConnecte] = useState(false);
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);

  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) charger(); }, [connecte]);

  const charger = async () => {
    setChargement(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setChargement(false); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/solvabilite', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    setChargement(false);
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setDonnees(data);
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const carte = {background:'#1a1a1a',border:'1px solid #333',borderRadius:'14px',padding:'20px'};
  const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

  if (!connecte) {
    return <AdminAuth titre="Admin Solvabilité" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>💰 Solvabilité</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={charger} disabled={chargement} style={{background:'#10b981',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>{chargement ? '⏳...' : '🔄 Actualiser'}</button>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:'#7f1d1d',color:'#fca5a5',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {donnees && (
          <>
            <div style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)',borderRadius:'20px',padding:'28px',textAlign:'center',marginBottom:'24px'}}>
              <p style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',fontWeight:700,textTransform:'uppercase',margin:'0 0 8px'}}>Exposition totale maximale (si tout le monde retire en même temps)</p>
              <h2 style={{color:'#fff',fontWeight:900,fontSize:'40px',margin:0}}>{fmt(donnees.expositionTotaleMax)} G</h2>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:'11px',margin:'8px 0 0'}}>Aie toujours au moins ce montant en réserve réelle avant de faire de la publicité à grande échelle.</p>
            </div>

            <div style={{background:'#7f1d1d',borderRadius:'14px',padding:'18px',marginBottom:'20px'}}>
              <p style={{color:'#fca5a5',fontSize:'12px',fontWeight:700,textTransform:'uppercase',margin:'0 0 6px'}}>⚠️ Obligation immédiate (déjà validée, pas encore payée)</p>
              <p style={{color:'#fff',fontWeight:900,fontSize:'26px',margin:0}}>{fmt(donnees.obligationImmediate.total)} G</p>
              <p style={{color:'#fca5a5',fontSize:'11px',margin:'6px 0 0'}}>{fmt(donnees.obligationImmediate.conversions)} G de conversions de points + {fmt(donnees.obligationImmediate.retraits)} G de retraits de paris, en attente de traitement</p>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
              <div style={carte}>
                <p style={{color:'#a78bfa',fontSize:'11px',fontWeight:700,textTransform:'uppercase',margin:'0 0 8px'}}>🎯 Points</p>
                <p style={{color:'#fff',fontWeight:900,fontSize:'22px',margin:'0 0 4px'}}>{fmt(donnees.points.expositionGourdes)} G</p>
                <p style={{color:'#6b7280',fontSize:'11px',margin:0}}>{fmt(donnees.points.totalEnCirculation)} points en circulation sur {donnees.points.nombreComptes} compte(s)</p>
              </div>
              <div style={carte}>
                <p style={{color:'#22d3ee',fontSize:'11px',fontWeight:700,textTransform:'uppercase',margin:'0 0 8px'}}>🎲 Paris</p>
                <p style={{color:'#fff',fontWeight:900,fontSize:'22px',margin:'0 0 4px'}}>{fmt(donnees.paris.expositionMaxGourdes)} G</p>
                <p style={{color:'#6b7280',fontSize:'11px',margin:0}}>{donnees.paris.comptesEligiblesRetrait} compte(s) déjà éligible(s) au retrait sur {donnees.paris.nombreComptes}</p>
              </div>
            </div>

            <p style={{color:'#6b7280',fontSize:'12px',lineHeight:'1.6'}}>
              💡 <strong>Comment lire ces chiffres :</strong> "Points" suppose que tout le monde convertit tout son solde d'un coup — un scénario extrême, peu probable en pratique. "Paris" ne compte que les comptes ayant déjà atteint les 25 000 G de mise qualifiante (1000 G chacun, montant fixe). L'obligation immédiate, elle, est réelle et concrète : c'est de l'argent déjà promis, à payer maintenant.
            </p>
          </>
        )}

      </main>
    </div>
  );
}
