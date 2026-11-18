'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';
const champ = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const, marginBottom: '12px' };

// Page d'arrivée du lien d'invitation envoyé à un nouveau caissier : il choisit son mot de passe,
// puis passe à la caisse où il active la double authentification.
export default function ActiverCaissier() {
  const [session, setSession] = useState<boolean | null>(null);
  const [erreurLien, setErreurLien] = useState('');
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [voir, setVoir] = useState(false);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('error_description')) setErreurLien('Ce lien est expiré ou déjà utilisé. Demandez une nouvelle invitation à l\'administrateur.');
    const { data: abo } = supabase.auth.onAuthStateChange((_e, s) => { if (s) setSession(true); });
    // Laisse à Supabase le temps de lire le lien, puis conclut.
    const t = setTimeout(() => { supabase.auth.getSession().then(({ data }) => setSession(!!data.session)); }, 1200);
    return () => { abo.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const valider = async () => {
    setMessage('');
    if (mdp.length < 10) { setMessage('Le mot de passe doit contenir au moins 10 caractères.'); return; }
    if (mdp !== mdp2) { setMessage('Les deux mots de passe ne sont pas identiques.'); return; }
    setOccupe(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setOccupe(false);
    if (error) { setMessage(error.message); return; }
    window.location.href = '/caisse';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '16px' }}>
      <div style={{ background: '#1a1a1a', padding: '32px 24px', borderRadius: '16px', width: '100%', maxWidth: '380px', border: '1px solid #333', color: '#fff' }}>
        <h1 style={{ color: VIOLET, fontWeight: 900, fontSize: '22px', margin: '0 0 8px', textAlign: 'center' }}>Activer mon accès caisse</h1>
        {session === null && !erreurLien && <p style={{ color: '#6b7280', textAlign: 'center' }}>Vérification du lien…</p>}
        {(erreurLien || session === false) && <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>{erreurLien || 'Lien invalide ou expiré. Demandez une nouvelle invitation à l\'administrateur.'}</p>}
        {session && !erreurLien && (
          <>
            <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', margin: '0 0 16px' }}>Choisissez votre mot de passe (10 caractères minimum). Vous activerez ensuite l'application Authenticator.</p>
            {message && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{message}</p>}
            <input type={voir ? 'text' : 'password'} value={mdp} onChange={e => setMdp(e.target.value)} placeholder="Mot de passe" style={champ} autoComplete="new-password" />
            <input type={voir ? 'text' : 'password'} value={mdp2} onChange={e => setMdp2(e.target.value)} placeholder="Confirmer le mot de passe" style={champ} autoComplete="new-password" />
            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '14px' }}><input type="checkbox" checked={voir} onChange={e => setVoir(e.target.checked)} /> Afficher</label>
            <button onClick={valider} disabled={occupe} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: VIOLET, color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: occupe ? 0.6 : 1 }}>{occupe ? '...' : 'Valider et continuer'}</button>
          </>
        )}
      </div>
    </div>
  );
}
