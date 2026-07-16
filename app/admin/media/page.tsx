'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type Article = {
  id: string;
  titre: string;
  categorie: string;
  image_couverture: string | null;
  extrait: string | null;
  contenu: string | null;
  publie: boolean;
  created_at: string;
};

export default function AdminMedia() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'editer'>('liste');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [titre, setTitre] = useState('');
  const [categorie, setCategorie] = useState('Actualités');
  const [imageCouverture, setImageCouverture] = useState('');
  const [extrait, setExtrait] = useState('');
  const [contenu, setContenu] = useState('');

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerArticles(); }, [connecte]);

  const chargerArticles = async () => {
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (data) setArticles(data);
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };

  const slugify = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage('');
    const nom = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { error } = await supabase.storage.from('articles').upload(nom, file);
    if (error) { setMessage('❌ Upload : ' + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from('articles').getPublicUrl(nom);
    setImageCouverture(data.publicUrl);
    setUploading(false);
    setMessage('✅ Image uploadée !');
  };

  const nouvelArticle = () => {
    setEditId(null); setTitre(''); setCategorie('Actualités');
    setImageCouverture(''); setExtrait(''); setContenu('');
    setVue('editer');
  };

  const editerArticle = (a: Article) => {
    setEditId(a.id); setTitre(a.titre); setCategorie(a.categorie);
    setImageCouverture(a.image_couverture || ''); setExtrait(a.extrait || ''); setContenu(a.contenu || '');
    setVue('editer');
  };

  const sauvegarder = async (publier: boolean) => {
    if (!titre) { setMessage('❌ Titre obligatoire.'); return; }
    setSaving(true); setMessage('');
    const payload = {
      titre, categorie, image_couverture: imageCouverture || null,
      extrait: extrait || null, contenu: contenu || null,
      slug: slugify(titre) + '-' + Date.now().toString().slice(-5),
      publie: publier, updated_at: new Date().toISOString()
    };
    if (editId) {
      const { error } = await supabase.from('articles').update(payload).eq('id', editId);
      setSaving(false);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Article mis à jour !');
    } else {
      const { error } = await supabase.from('articles').insert(payload);
      setSaving(false);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Article créé !');
    }
    chargerArticles();
    setTimeout(() => setVue('liste'), 1200);
  };

  const togglePublie = async (a: Article) => {
    await supabase.from('articles').update({ publie: !a.publie }).eq('id', a.id);
    chargerArticles();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    await supabase.from('articles').delete().eq('id', id);
    chargerArticles();
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px'};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Média</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>📰 Admin Média</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={nouvelArticle} style={{background:vue==='editer'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouvel article</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'editer' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>{editId ? 'Modifier l\'article' : 'Nouvel article'}</h2>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Titre *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'article" style={inputStyle}/>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Catégorie</label>
              <select value={categorie} onChange={e => setCategorie(e.target.value)} style={inputStyle}>
                <option value="Actualités">Actualités</option>
                <option value="Revue de presse">Revue de presse</option>
              </select>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Image de couverture</label>
              <input type="file" accept="image/*" onChange={uploadImage} style={{...inputStyle,padding:'8px'}}/>
              {uploading && <p style={{color:'#f59e0b',fontSize:'12px',margin:'8px 0 0'}}>⏳ Upload en cours...</p>}
              {imageCouverture && <img src={imageCouverture} alt="couverture" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginTop:'12px'}}/>}
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Extrait (résumé court affiché dans la liste)</label>
              <textarea value={extrait} onChange={e => setExtrait(e.target.value)} rows={2} placeholder="Un résumé de 1-2 phrases..." style={{...inputStyle,resize:'vertical'}}/>
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={labelStyle}>Contenu (Markdown)</label>
              <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px'}}>
                Astuce : ## pour un titre, **gras**, *italique*, ![texte](url-image) pour une image, [texte](lien) pour un lien.
              </p>
              <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={16} placeholder="Écrivez votre article ici..." style={{...inputStyle,resize:'vertical',fontFamily:'monospace',lineHeight:'1.6'}}/>
            </div>

            <div style={{display:'flex',gap:'12px'}}>
              <button onClick={() => sauvegarder(false)} disabled={saving} style={{flex:1,padding:'14px',background:'#6b7280',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>💾 Brouillon</button>
              <button onClick={() => sauvegarder(true)} disabled={saving} style={{flex:1,padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{saving ? '...' : '🚀 Publier'}</button>
            </div>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {articles.length === 0 && <p style={{color:'#6b7280'}}>Aucun article. Créez-en un.</p>}
            {articles.map(a => (
              <div key={a.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'16px',marginBottom:'12px',display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                {a.image_couverture && <img src={a.image_couverture} alt={a.titre} style={{width:'80px',height:'60px',objectFit:'cover',borderRadius:'8px'}}/>}
                <div style={{flex:1,minWidth:'200px'}}>
                  <span style={{fontSize:'10px',background:a.categorie==='Actualités'?'#3b82f6':'#f59e0b',color:'#fff',padding:'2px 8px',borderRadius:'999px'}}>{a.categorie}</span>
                  <p style={{color:'#fff',fontWeight:700,margin:'6px 0 2px',fontSize:'15px'}}>{a.titre}</p>
                  <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <button onClick={() => togglePublie(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:a.publie?'#10b981':'#374151',color:'#fff'}}>{a.publie ? '✓ Publié' : 'Brouillon'}</button>
                  <button onClick={() => editerArticle(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid '+VIOLET,background:'transparent',color:VIOLET,cursor:'pointer',fontWeight:700,fontSize:'11px'}}>✏️</button>
                  <button onClick={() => supprimer(a.id)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>🗑️</button>
                </div>
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  );
}
