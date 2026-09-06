'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const VIOLET = '#bf00ff';

type Props = {
  titre: string;
  onAuthentifie: () => void;
};

type Etape = 'verification' | 'motdepasse' | 'inscription2fa' | 'code2fa';

export default function AdminAuth({ titre, onAuthentifie }: Props) {
  const [etape, setEtape] = useState<Etape>('verification');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { verifierSessionExistante(); }, []);

  const verifierSessionExistante = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setEtape('motdepasse'); return; }
    await verifierNiveauMfa();
  };

  const verifierNiveauMfa = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) { setEtape('motdepasse'); return; }

    if (data.currentLevel === 'aal2') {
      onAuthentifie();
      return;
    }

    if (data.nextLevel === 'aal2') {
      const { data: facteurs } = await supabase.auth.mfa.listFactors();
      const facteur = facteurs?.totp?.[0];
      if (facteur) { setFactorId(facteur.id); setEtape('code2fa'); return; }
    }

    await demarrerInscription2fa();
  };

  const seConnecter = async () => {
    setErreur(''); setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setEnCours(false);
    if (error) { setErreur('Email ou mot de passe incorrect.'); return; }
    await verifierNiveauMfa();
  };

  const demarrerInscription2fa = async () => {
    setEnCours(true); setErreur('');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setEnCours(false);
    if (error) { setErreur(error.message); return; }
    setQrCode(data.totp.qr_code);
    setFactorId(data.id);
    setEtape('inscription2fa');
  };

  const validerCode = async () => {
    if (!code.trim()) { setErreur('Entrez le code à 6 chiffres.'); return; }
    setErreur(''); setEnCours(true);
    const { data: challenge, error: erreurChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (erreurChallenge) { setEnCours(false); setErreur(erreurChallenge.message); return; }
    const { error: erreurVerif } = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.id, code: code.trim()
    });
    setEnCours(false);
    if (erreurVerif) { setErreur('Code incorrect. Réessayez.'); return; }
    onAuthentifie();
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};

  if (etape === 'verification') {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <p style={{color:'#6b7280'}}>Vérification…</p>
      </div>
    );
  }

  if (etape === 'motdepasse') {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>{titre}</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreur && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreur}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{...inputStyle,marginBottom:'12px'}}/>
          <div style={{position:'relative'}}>
            <input type={voirMdp ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{...inputStyle,paddingRight:'44px',marginBottom:'16px'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
            <button type="button" onClick={() => setVoirMdp(v => !v)} style={{position:'absolute',right:'8px',top:'18px',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>{voirMdp ? '🙈' : '👁️'}</button>
          </div>
          <button onClick={seConnecter} disabled={enCours} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>{enCours ? '⏳...' : 'Se connecter'}</button>
        </div>
      </div>
    );
  }

  if (etape === 'inscription2fa') {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',padding:'20px'}}>
        <div style={{background:'#1a1a1a',padding:'32px',borderRadius:'16px',width:'100%',maxWidth:'400px',border:'1px solid #333',textAlign:'center'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>🔒 Activation obligatoire du 2FA</h1>
          <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'20px'}}>Scannez ce code avec Google Authenticator, Authy, ou une app similaire.</p>
          {qrCode && (
            <div style={{background:'#fff',padding:'12px',borderRadius:'12px',display:'inline-block',marginBottom:'20px'}}
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
          )}
          {erreur && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px'}}>{erreur}</p>}
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code à 6 chiffres" maxLength={6}
            style={{...inputStyle,marginBottom:'16px',textAlign:'center',fontSize:'20px',letterSpacing:'4px'}}
            onKeyDown={e => e.key === 'Enter' && validerCode()}
          />
          <button onClick={validerCode} disabled={enCours} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>{enCours ? '⏳...' : 'Confirmer et activer'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',padding:'20px'}}>
      <div style={{background:'#1a1a1a',padding:'32px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333',textAlign:'center'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>🔒 Code de vérification</h1>
        <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'20px'}}>Ouvrez votre application d'authentification et entrez le code affiché.</p>
        {erreur && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px'}}>{erreur}</p>}
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code à 6 chiffres" maxLength={6}
          style={{...inputStyle,marginBottom:'16px',textAlign:'center',fontSize:'20px',letterSpacing:'4px'}}
          onKeyDown={e => e.key === 'Enter' && validerCode()}
        />
        <button onClick={validerCode} disabled={enCours} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>{enCours ? '⏳...' : 'Valider'}</button>
      </div>
    </div>
  );
}
