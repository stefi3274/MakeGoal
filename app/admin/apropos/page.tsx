'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

export default function AdminApropos() {
  const [connecte, setConnecte] = useState(false);
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [x, setX] = useState('');
  const [youtube, setYoutube] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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
      setFacebook(data.facebook || ''); setInstagram(data.instagram || ''); setTiktok(data.tiktok || '');
      setX(data.x || ''); setYoutube(data.youtube || ''); setWhatsapp(data.whatsapp || '');
    }
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
      titre, texte, photo_url: photoUrl || null,
      facebook: facebook || null, instagram: instagram || null, tiktok: tiktok || null,
      x: x || null, youtube: youtube || null, whatsapp: whatsapp || null,
      updated_at: new Date().toISOString()
    }).eq('id', 1);
    setSaving(false);
    if (error) setMessage('❌ ' + error.message);
    else setMessage('✅ Page À propos mise à jour !');
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px'};

  if (!connecte) {
    return <AdminAuth titre="Admin À propos" onAuthentifie={() => { setConnecte(true); charger(); }} />;
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

          <div style={{marginBottom:'24px',paddingTop:'20px',borderTop:'1px solid #333'}}>
            <label style={{...labelStyle,fontSize:'14px',color:'#fff',fontWeight:700,marginBottom:'14px'}}>📱 Réseaux sociaux</label>
            <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Affichés en icônes dans le pied de page du site. Laisser vide si non applicable.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div><label style={labelStyle}>Facebook</label><input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="https://facebook.com/makegoal" style={inputStyle}/></div>
              <div><label style={labelStyle}>Instagram</label><input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/makegoal" style={inputStyle}/></div>
              <div><label style={labelStyle}>TikTok</label><input value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="https://tiktok.com/@makegoal" style={inputStyle}/></div>
              <div><label style={labelStyle}>X (Twitter)</label><input value={x} onChange={e => setX(e.target.value)} placeholder="https://x.com/makegoal" style={inputStyle}/></div>
              <div><label style={labelStyle}>YouTube</label><input value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="https://youtube.com/@makegoal" style={inputStyle}/></div>
              <div><label style={labelStyle}>WhatsApp (chaîne/groupe)</label><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="https://wa.me/..." style={inputStyle}/></div>
            </div>
          </div>

          <button onClick={sauvegarder} disabled={saving} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>
            {saving ? '...' : '💾 Enregistrer'}
          </button>

        </div>
      </main>
    </div>
  );
}
