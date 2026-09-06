'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { initialiserSoldeParis } from '../../lib/paris';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

function CompteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParrain = searchParams.get('ref');
  const [mode, setMode] = useState<'connexion' | 'inscription'>(refParrain ? 'inscription' : 'connexion');
  const [email, setEmail] = useState('');
  const [majeur, setMajeur] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refParrain) {
      setMessage('🎁 Un ami vous a invité ! Inscrivez-vous pour rejoindre le concours.');
    }
  }, [refParrain]);

  // Le parrainage passe par une route API sécurisée : c'est elle qui distribue
  // les points (au parrain et à toute la chaîne au-dessus), jamais le navigateur
  // directement — pour qu'il soit impossible de trafiquer son solde depuis la console.
  const enregistrerParrainage = async () => {
    if (!refParrain) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    try {
      await fetch('/api/parrainage-confirmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ parrainId: refParrain })
      });
    } catch {
      // Le compte est créé même si le parrainage échoue à s'enregistrer ;
      // on ne bloque jamais l'inscription pour ça.
    }
  };

  const seConnecter = async () => {
    setLoading(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage('❌ ' + (error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message));
    } else {
      router.push('/profil');
    }
  };

  const sinscrire = async () => {
    if (!email || !password) { setMessage('❌ Email et mot de passe obligatoires.'); return; }
    if (password.length < 6) { setMessage('❌ Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (!majeur) { setMessage('❌ Vous devez confirmer avoir 18 ans ou plus pour créer un compte.'); return; }
    setLoading(true); setMessage('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username || email.split('@')[0] } }
    });
    setLoading(false);
    if (error) {
      setMessage('❌ ' + error.message);
    } else {
      if (data.user && refParrain) {
        // Si l'email doit être confirmé, la session n'existe pas encore : le
        // parrainage sera retenté à la première connexion (voir useEffect ci-dessous
        // si vous activez la confirmation par email plus tard). Si la confirmation
        // par email est désactivée dans Supabase, la session existe déjà ici.
        await enregistrerParrainage();
      }
      if (data.user) {
        // 5 000 Gourdes virtuelles de départ pour le système de paris
        await initialiserSoldeParis(data.user.id);

        // Journal d'adresse IP à l'inscription (détection de comptes multiples)
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          fetch('/api/signup-log', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }).catch(() => {});
        }
      }
      setMessage('✅ Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
      setEmail(''); setPassword(''); setUsername('');
    }
  };

  const inputStyle = {
    width:'100%', padding:'14px 16px', borderRadius:'12px',
    border:'1px solid #e5e7eb', fontSize:'15px', boxSizing:'border-box' as const,
    marginBottom:'14px'
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif',display:'flex',flexDirection:'column'}}>
      <Header />
      <main style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'48px 24px'}}>
        <div style={{width:'100%',maxWidth:'420px'}}>

          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <h1 style={{color:VIOLET,fontWeight:900,fontSize:'32px',margin:'0 0 8px'}}>
              {mode === 'connexion' ? 'Connexion' : 'Créer un compte'}
            </h1>
            <p style={{color:'#6b7280',fontSize:'15px',margin:0}}>
              {mode === 'connexion' ? 'Accédez à vos favoris et votre agenda' : 'Suivez vos équipes et vos matchs favoris'}
            </p>
          </div>

          <div style={{display:'flex',gap:'8px',marginBottom:'24px',background:'#f3f4f6',borderRadius:'12px',padding:'4px'}}>
            <button onClick={() => { setMode('connexion'); setMessage(''); }} style={{flex:1, padding:'12px', borderRadius:'8px', border:'none', cursor:'pointer',
              fontWeight:700, fontSize:'14px',
              background: mode === 'connexion' ? '#fff' : 'transparent',
              color: mode === 'connexion' ? VIOLET : '#6b7280',
              boxShadow: mode === 'connexion' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
            }}>
              Connexion
            </button>
            <button onClick={() => { setMode('inscription'); setMessage(''); }} style={{
              flex:1, padding:'12px', borderRadius:'8px', border:'none', cursor:'pointer',
              fontWeight:700, fontSize:'14px',
              background: mode === 'inscription' ? '#fff' : 'transparent',
              color: mode === 'inscription' ? VIOLET : '#6b7280',
              boxShadow: mode === 'inscription' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
            }}>
              Inscription
            </button>
          </div>

          {message && (
            <div style={{
              padding:'12px 16px', borderRadius:'12px', marginBottom:'16px', fontSize:'14px', fontWeight:600,
              background: message.includes('❌') ? '#fef2f2' : '#f0fdf4',
              color: message.includes('❌') ? '#ef4444' : '#10b981'
            }}>
              {message}
            </div>
          )}

          {mode === 'inscription' && (
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Nom d'utilisateur (optionnel)" style={inputStyle}/>
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inputStyle}/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe" style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && (mode === 'connexion' ? seConnecter() : sinscrire())}
          />

          {mode === 'inscription' && (
            <label style={{display:'flex',alignItems:'flex-start',gap:'8px',fontSize:'13px',color:'#374151',cursor:'pointer'}}>
              <input type="checkbox" checked={majeur} onChange={e => setMajeur(e.target.checked)} style={{marginTop:'2px'}}/>
              <span>Je confirme avoir <strong>18 ans ou plus</strong>. Ce site propose du vote communautaire et des paris avec Gourdes virtuelles.</span>
            </label>
          )}

          <button
            onClick={mode === 'connexion' ? seConnecter : sinscrire}
            disabled={loading}
            style={{
              width:'100%', padding:'16px', borderRadius:'12px', border:'none',
              background: loading ? '#9ca3af' : VIOLET, color:'#fff',
              fontWeight:700, fontSize:'16px', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop:'8px'
            }}
          >
            {loading ? '...' : (mode === 'connexion' ? 'Se connecter' : 'Créer mon compte')}
          </button>

          <p style={{textAlign:'center',color:'#9ca3af',fontSize:'13px',marginTop:'24px'}}>
            {mode === 'connexion' ? "Pas encore de compte ? " : 'Déjà inscrit ? '}
            <button onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setMessage(''); }} style={{background:'none',border:'none',color:VIOLET,fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
              {mode === 'connexion' ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>

        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Compte() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#fff'}}/>}>
      <CompteContent />
    </Suspense>
  );
}
