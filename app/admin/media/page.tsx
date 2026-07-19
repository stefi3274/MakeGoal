'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type Article = {
  id: string;
  titre: string;
  categorie: string;
  type: string;
  langue: string;
  source_nom: string | null;
  source_url: string | null;
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
  const [type, setType] = useState('article');
  const [langue, setLangue] = useState('fr');
  const [categorie, setCategorie] = useState('Actualités');
  const [sourceNom, setSourceNom] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
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
    setEditId(null); setTitre(''); setType('article'); setLangue('fr'); setCategorie('Actualités');
    setSourceNom(''); setSourceUrl(''); setImageCouverture(''); setExtrait(''); setContenu('');
    setVue('editer');
  };

  const editerArticle = (a: Article) => {
    setEditId(a.id); setTitre(a.titre); setType(a.type || 'article'); setLangue(a.langue || 'fr');
    setCategorie(a.categorie); setSourceNom(a.source_nom || ''); setSourceUrl(a.source_url || '');
    setImageCouverture(a.image_couverture || ''); setExtrait(a.extrait || ''); setContenu(a.contenu || '');
    setVue('editer');
  };

  const sauvegarder = async (publier: boolean) => {
    if (!titre) { setMessage('❌ Titre obligatoire.'); return; }
    setSaving(true); setMessage('');
    const payload = {
      titre, type, langue, categorie,
      source_nom: sourceNom || null, source_url: sourceUrl || null,
      image_couverture: imageCouverture || null,
      extrait: extrait || null, contenu: contenu || null,
      slug: slugify(titre) + '-' + Date.now().toString().slice(-5),
      publie: publier, updated_at: new Date().toISOString()
    };
    if (editId) {
      const { error } = await supabase.from('articles').update(payload).eq('id', editId);
      setSaving(false);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Mis à jour !');
    } else {
      const { error } = await supabase.from('articles').insert(payload);
      setSaving(false);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Créé !');
    }
    chargerArticles();
    setTimeout(() => setVue('liste'), 1200);
  };

  const togglePublie = async (a: Article) => {
    await supabase.from('articles').update({ publie: !a.publie }).eq('id', a.id);
    chargerArticles();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
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

  const btnChoix = (actif: boolean) => ({
    flex:1, padding:'10px', borderRadius:'8px', border:actif?'2px solid '+VIOLET:'1px solid #333',
    background:actif?'#2a1a3a':'#222', color:actif?'#fff':'#9ca3af', cursor:'pointer', fontWeight:700, fontSize:'13px'
  });

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>📰 Admin Média</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={nouvelArticle} style={{background:vue==='editer'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'editer' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>{editId ? 'Modifier' : 'Nouveau contenu'}</h2>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Format</label>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => setType('article')} style={btnChoix(type==='article')}>📄 Article (long)</button>
                <button onClick={() => setType('post')} style={btnChoix(type==='post')}>⚡ Post (bref, style Romano)</button>
              </div>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Langue</label>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => setLangue('fr')} style={btnChoix(langue==='fr')}>🇫🇷 Français</button>
                <button onClick={() => setLangue('kreyol')} style={btnChoix(langue==='kreyol')}>🇭🇹 Kreyòl</button>
              </div>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Titre *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder={type==='post'?'L\'info percutante':'Titre de l\'article'} style={inputStyle}/>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Catégorie</label>
              <select value={categorie} onChange={e => setCategorie(e.target.value)} style={inputStyle}>
                <option value="Actualités">Actualités</option>
                <option value="Revue de presse">Revue de presse</option>
              </select>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div><label style={labelStyle}>Source (nom)</label><input value={sourceNom} onChange={e => setSourceNom(e.target.value)} placeholder="Fabrizio Romano, L'Équipe..." style={inputStyle}/></div>
              <div><label style={labelStyle}>Lien source (optionnel)</label><input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." style={inputStyle}/></div>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={labelStyle}>Image {type==='post'?'(optionnelle)':'de couverture'}</label>
              <input type="file" accept="image/*" onChange={uploadImage} style={{...inputStyle,padding:'8px'}}/>
              {uploading && <p style={{color:'#f59e0b',fontSize:'12px',margin:'8px 0 0'}}>⏳ Upload...</p>}
              {imageCouverture && <img src={imageCouverture} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginTop:'12px'}}/>}
            </div>

            {type === 'article' && (
              <div style={{marginBottom:'16px'}}>
                <label style={labelStyle}>Extrait (résumé pour la liste)</label>
                <textarea value={extrait} onChange={e => setExtrait(e.target.value)} rows={2} placeholder="Résumé court..." style={{...inputStyle,resize:'vertical'}}/>
              </div>
            )}

            <div style={{marginBottom:'20px'}}>
              <label style={labelStyle}>{type==='post' ? 'Le texte du post' : 'Contenu (Markdown)'}</label>
              {type === 'article' && <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px'}}>## titre, **gras**, *italique*, ![img](url), [lien](url)</p>}
              <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={type==='post'?6:16} placeholder={type==='post'?'Écrivez votre brève percutante...':'Écrivez votre article...'} style={{...inputStyle,resize:'vertical',lineHeight:'1.6',fontFamily:type==='article'?'monospace':'inherit'}}/>
            </div>

            <div style={{display:'flex',gap:'12px'}}>
              <button onClick={() => sauvegarder(false)} disabled={saving} style={{flex:1,padding:'14px',background:'#6b7280',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>💾 Brouillon</button>
              <button onClick={() => sauvegarder(true)} disabled={saving} style={{flex:1,padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{saving ? '...' : '🚀 Publier'}</button>
            </div>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {articles.length === 0 && <p style={{color:'#6b7280'}}>Aucun contenu.</p>}
            {articles.map(a => (
              <div key={a.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'16px',marginBottom:'12px',display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                {a.image_couverture && <img src={a.image_couverture} alt={a.titre} style={{width:'80px',height:'60px',objectFit:'cover',borderRadius:'8px'}}/>}
                <div style={{flex:1,minWidth:'200px'}}>
                  <div style={{display:'flex',gap:'6px',marginBottom:'4px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'10px',background:a.type==='post'?VIOLET:'#374151',color:'#fff',padding:'2px 8px',borderRadius:'999px'}}>{a.type==='post'?'⚡ Post':'📄 Article'}</span>
                    <span style={{fontSize:'10px',background:'#222',color:'#fff',padding:'2px 8px',borderRadius:'999px'}}>{a.langue==='kreyol'?'🇭🇹 Kreyòl':'🇫🇷 FR'}</span>
                  </div>
                  <p style={{color:'#fff',fontWeight:700,margin:'4px 0 2px',fontSize:'15px'}}>{a.titre}</p>
                  {a.source_nom && <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>Source : {a.source_nom}</p>}
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
