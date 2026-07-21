'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

export default function AdminApropos() {
  const [connecte, setConnecte] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) { setConnecte(true); charger(); } }); }, []);

  const charger = async () => {
    const { data } = await supabase.from('a_propos').select('*').eq('id', 1).single();
    if (data) {
      setTitre(data.titre || 'À propos de MakeGoal');
      setTexte(data.texte || '');
      setPhotoUrl(data.photo_url || '');
    }
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else { setConnecte(true); charger(); }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage('');
    const nom = 'profil-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { error } = await supabase.storage.from('images').upload(nom, file);
    if (error) { setMessage('❌ Upload : ' + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from('images').getPublicUrl(nom);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
    setMessage('✅ Photo uploadée !');
  };

  const sauvegarder = async () => {
    setSaving(true); setMessage('');
    const { error } = await supabase.from('a_propos').update({
      titre, texte, photo_url: photoUrl || null, updated_at: new Date().toISOString()
    }).eq('id', 1);
    setSaving(false);
    if (error) setMessage('❌ ' + error.message);
    else setMessage('✅ Page À propos mise à jour !');
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px'};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin À propos</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}/>
          <div style={{position:'relative'}}>
            <input type={voirMdp ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{width:'100%',padding:'12px',paddingRight:'44px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
            <button type="button" onClick={() => setVoirMdp(v => !v)} style={{position:'absolute',right:'8px',top:'18px',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>{voirMdp ? '🙈' : '👁️'}</button>
          </div>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>👤 À propos</h1>
        <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'700px',margin:'0 auto',padding:'40px 24px'}}>
        <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'16px',padding:'28px'}}>

          <div style={{marginBottom:'24px'}}>
            <label style={labelStyle}>Photo de profil</label>
            <input type="file" accept="image/*" onChange={uploadPhoto} style={{...inputStyle,padding:'8px'}}/>
            {uploading && <p style={{color:'#f59e0b',fontSize:'12px',margin:'8px 0 0'}}>⏳ Upload en cours...</p>}
            {photoUrl && <img src={photoUrl} alt="profil" style={{width:'120px',height:'120px',objectFit:'cover',borderRadius:'50%',marginTop:'16px',border:'3px solid '+VIOLET}}/>}
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={labelStyle}>Titre</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="À propos de MakeGoal" style={inputStyle}/>
          </div>

          <div style={{marginBottom:'24px'}}>
            <label style={labelStyle}>Texte de présentation</label>
            <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={10} placeholder="Présentez MakeGoal et vous-même..." style={{...inputStyle,resize:'vertical',lineHeight:'1.6'}}/>
          </div>

          <button onClick={sauvegarder} disabled={saving} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>
            {saving ? '...' : '💾 Enregistrer'}
          </button>

        </div>
      </main>
    </div>
  );
}
