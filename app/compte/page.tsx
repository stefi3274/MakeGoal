'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

export default function Compte() {
  const router = useRouter();
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true); setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username || email.split('@')[0] } }
    });
    setLoading(false);
    if (error) {
      setMessage('❌ ' + error.message);
    } else {
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
            <button onClick={() => { setMode('connexion'); setMessage(''); }} style={{
              flex:1, padding:'12px', borderRadius:'8px', border:'none', cursor:'pointer',
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
          </div>{message && (
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