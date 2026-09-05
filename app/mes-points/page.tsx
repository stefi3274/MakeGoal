'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { soldePoints, historiquePoints, parrainageInviteEnvoyee } from '../../lib/points';

const VIOLET = '#bf00ff';
const SEUIL_CONVERSION = 10000;
const TAUX_CONVERSION = 0.20;

type Transaction = {
  id: string; montant: number; raison: string; libelle: string | null;
  solde_apres: number; created_at: string;
};

const ICONES: Record<string, string> = {
  resultat_joue: '🎮', resultat_gagne: '✅', resultat_perdu: '❌',
  score_exact_joue: '🎮', score_exact_gagne: '🎯', score_exact_perdu: '❌',
  buteur_joue: '🎮', buteur_gagne: '⚽', buteur_perdu: '❌',
  parrainage_invite: '📨', parrainage_inscription: '🤝', parrainage_bienvenue: '🎉',
  question_eclair_gagnant: '⚡',
  conversion_gourdes: '💰'
};

export default function MesPoints() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [solde, setSolde] = useState(0);
  const [historique, setHistorique] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilleul, setEmailFilleul] = useState('');
  const [messageInvite, setMessageInvite] = useState('');
  const [envoiInvite, setEnvoiInvite] = useState(false);
  const [pointsAConvertir, setPointsAConvertir] = useState('');
  const [messageConversion, setMessageConversion] = useState('');
  const [conversionEnCours, setConversionEnCours] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.push('/compte'); }, [authLoading, user]);
  useEffect(() => { if (user) charger(); }, [user]);

  const charger = async () => {
    if (!user) return;
    setLoading(true);
    const [s, h] = await Promise.all([soldePoints(user.id), historiquePoints(user.id, 100)]);
    setSolde(s); setHistorique(h as Transaction[]);
    setLoading(false);
  };

  const envoyerInvitation = async () => {
    if (!user || !emailFilleul.trim()) { setMessageInvite('❌ Entrez un email.'); return; }
    setEnvoiInvite(true); setMessageInvite('');
    const resultat = await parrainageInviteEnvoyee(user.id, emailFilleul.trim().toLowerCase());
    setEnvoiInvite(false);
    if (!resultat.ok) { setMessageInvite('❌ ' + resultat.erreur); return; }
    setMessageInvite('✅ Invitation enregistrée ! Vous avez reçu +10 points.');
    setEmailFilleul('');
    charger();
  };

  const soumettreConversion = async () => {
    if (!user) return;
    const points = parseInt(pointsAConvertir);
    if (!points || points < SEUIL_CONVERSION) { setMessageConversion('❌ Minimum ' + SEUIL_CONVERSION + ' points.'); return; }
    setConversionEnCours(true); setMessageConversion('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setConversionEnCours(false); setMessageConversion('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/conversion-demander', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ points })
    });
    const resultat = await res.json();
    setConversionEnCours(false);
    if (!res.ok) { setMessageConversion('❌ ' + (resultat.error || 'Erreur.')); return; }
    setMessageConversion('✅ Demande envoyée : ' + points + ' points → ' + resultat.montantGourdes + ' Gourdes. En attente de traitement.');
    setPointsAConvertir('');
    charger();
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Port-au-Prince' });

  const lienParrainage = user ? (typeof window !== 'undefined' ? window.location.origin : '') + '/compte?ref=' + user.id : '';
  const [lienCopie, setLienCopie] = useState(false);
  const copierLien = () => {
    navigator.clipboard.writeText(lienParrainage);
    setLienCopie(true);
    setTimeout(() => setLienCopie(false), 2000);
  };

  const progression = Math.min(100, Math.round((solde / SEUIL_CONVERSION) * 100));
  const peutConvertir = solde >= SEUIL_CONVERSION;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div style={{minHeight:'100vh',background:'#fff'}}>
        <Header />
        <main style={{maxWidth:'700px',margin:'0 auto',padding:'48px 24px',textAlign:'center'}}>
          <p style={{color:'#9ca3af'}}>Chargement…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{display:'flex',gap:'8px',maxWidth:'700px',margin:'16px auto 0',padding:'0 16px'}}>
        <a href="/mes-points" style={{flex:1,textAlign:'center',padding:'10px',borderRadius:'999px',fontWeight:700,fontSize:'13px',textDecoration:'none',background:VIOLET,color:'#fff'}}>🎯 Points</a>
        <a href="/paris" style={{flex:1,textAlign:'center',padding:'10px',borderRadius:'999px',fontWeight:700,fontSize:'13px',textDecoration:'none',background:'#f3f4f6',color:'#6b7280'}}>🎲 Paris</a>
      </div>

      <div style={{background:'linear-gradient(135deg,#1a0033,'+VIOLET+')',padding:'40px 24px',textAlign:'center'}}>
        <p style={{color:'rgba(255,255,255,0.75)',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 8px'}}>Mes points</p>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'52px',margin:'0 0 4px'}}>{loading ? '…' : solde.toLocaleString('fr-FR')}</h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'14px',margin:0}}>points</p>
      </div>

      <main style={{maxWidth:'700px',margin:'0 auto',padding:'32px 16px'}}>

        {/* Progression vers la conversion */}
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'20px',marginBottom:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{fontSize:'13px',fontWeight:700,color:'#374151'}}>Progression vers la conversion</span>
            <span style={{fontSize:'13px',fontWeight:900,color:VIOLET}}>{solde.toLocaleString('fr-FR')} / {SEUIL_CONVERSION.toLocaleString('fr-FR')}</span>
          </div>
          <div style={{background:'#f3f4f6',borderRadius:'999px',height:'10px',overflow:'hidden'}}>
            <div style={{background:VIOLET,height:'100%',width:progression+'%',borderRadius:'999px',transition:'width 0.4s'}}/>
          </div>
          <p style={{fontSize:'12px',color:'#9ca3af',margin:'10px 0 0'}}>À {SEUIL_CONVERSION.toLocaleString('fr-FR')} points, convertissez en Gourdes au taux de {TAUX_CONVERSION*100}% (ex: 10 000 pts → {Math.round(SEUIL_CONVERSION*TAUX_CONVERSION)} Gourdes).</p>
        </div>

        {/* Conversion */}
        {peutConvertir && (
          <div style={{background:'#f0fdf4',border:'2px solid #10b981',borderRadius:'16px',padding:'20px',marginBottom:'20px'}}>
            <h3 style={{fontWeight:900,fontSize:'16px',color:'#065f46',margin:'0 0 12px'}}>💰 Convertir en Gourdes</h3>
            <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
              <input type="number" min={SEUIL_CONVERSION} max={solde} value={pointsAConvertir} onChange={e => setPointsAConvertir(e.target.value)} placeholder={'Min. ' + SEUIL_CONVERSION} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #d1fae5',fontSize:'14px'}}/>
              <button onClick={soumettreConversion} disabled={conversionEnCours} style={{padding:'12px 20px',background:'#10b981',color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>{conversionEnCours ? '...' : 'Convertir'}</button>
            </div>
            {pointsAConvertir && parseInt(pointsAConvertir) >= SEUIL_CONVERSION && (
              <p style={{fontSize:'13px',color:'#065f46',margin:'0 0 8px'}}>≈ {Math.round(parseInt(pointsAConvertir) * TAUX_CONVERSION)} Gourdes</p>
            )}
            {messageConversion && <p style={{fontSize:'13px',color:messageConversion.includes('❌')?'#dc2626':'#065f46',margin:0}}>{messageConversion}</p>}
          </div>
        )}

        {/* Parrainage */}
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'20px',marginBottom:'20px'}}>
          <h3 style={{fontWeight:900,fontSize:'16px',color:'#111',margin:'0 0 6px'}}>🎁 Parrainage</h3>
          <p style={{fontSize:'12px',color:'#6b7280',margin:'0 0 14px'}}>Invitez un ami par email (+10 points immédiatement), et gagnez encore plus quand toute votre chaîne grandit.</p>
          <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
            <input type="email" value={emailFilleul} onChange={e => setEmailFilleul(e.target.value)} placeholder="email@ami.com" style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}}/>
            <button onClick={envoyerInvitation} disabled={envoiInvite} style={{padding:'12px 20px',background:VIOLET,color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>{envoiInvite ? '...' : 'Inviter'}</button>
          </div>
          {messageInvite && <p style={{fontSize:'13px',color:messageInvite.includes('❌')?'#dc2626':'#10b981',margin:'0 0 14px'}}>{messageInvite}</p>}

          <p style={{fontSize:'12px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Ou partagez votre lien</p>
          <div style={{display:'flex',gap:'8px'}}>
            <input readOnly value={lienParrainage} style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'12px',color:'#6b7280',background:'#f9fafb'}}/>
            <button onClick={copierLien} style={{padding:'10px 16px',background:'#e5e7eb',color:'#374151',border:'none',borderRadius:'10px',fontWeight:700,fontSize:'13px',cursor:'pointer',whiteSpace:'nowrap'}}>{lienCopie ? '✓ Copié' : 'Copier'}</button>
          </div>
        </div>

        {/* Historique */}
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',overflow:'hidden'}}>
          <h3 style={{fontWeight:900,fontSize:'16px',color:'#111',margin:0,padding:'20px 20px 12px'}}>📜 Historique</h3>
          {loading && <p style={{color:'#9ca3af',fontSize:'13px',padding:'0 20px 20px'}}>Chargement…</p>}
          {!loading && historique.length === 0 && <p style={{color:'#9ca3af',fontSize:'13px',padding:'0 20px 20px'}}>Aucun mouvement pour le moment.</p>}
          {historique.map((t, i) => (
            <div key={t.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 20px',borderTop:'1px solid #f3f4f6',background:i%2===0?'#fff':'#fcfcfd'}}>
              <span style={{fontSize:'20px'}}>{ICONES[t.raison] || '•'}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,fontSize:'13.5px',color:'#111',margin:0}}>{t.libelle || t.raison}</p>
                <p style={{fontSize:'11px',color:'#9ca3af',margin:0}}>{formatDate(t.created_at)}</p>
              </div>
              <span style={{fontWeight:900,fontSize:'15px',color:t.montant>0?'#16a34a':'#dc2626',whiteSpace:'nowrap'}}>{t.montant>0?'+':''}{t.montant}</span>
            </div>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
}
