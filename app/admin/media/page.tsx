'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

const TAGS_GROUPES: { titre: string; tags: string[] }[] = [
  { titre: 'Compétition', tags: ['Club', 'Sélection', 'Championnat', 'Coupe', 'Ligue des Champions', 'Coupe du Monde', 'Euro', 'Éliminatoires', 'Copa America', 'CAN'] },
  { titre: 'Genre & catégorie', tags: ['Masculin', 'Féminin', 'U-17', 'U-20', 'Olympique'] },
  { titre: 'Statut du match', tags: ['Match bientôt', 'Mi-temps', 'Match terminé', 'Statistiques'] },
  { titre: 'Transfert', tags: ['Transfert', 'En attente', 'Officiel'] },
];

type Article = {
  id: string; titre: string; categorie: string; type: string; langue: string;
  source_nom: string | null; source_url: string | null;
  tags: string[] | null; pays1: string | null; pays2: string | null;
  image_couverture: string | null; extrait: string | null; contenu: string | null;
  publie: boolean; created_at: string;
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
  const [tags, setTags] = useState<string[]>([]);
  const [pays1, setPays1] = useState('');
  const [pays2, setPays2] = useState('');

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

  const resetForm = () => {
    setTitre(''); setType('article'); setLangue('fr'); setCategorie('Actualités');
    setSourceNom(''); setSourceUrl(''); setImageCouverture(''); setExtrait(''); setContenu('');
    setTags([]); setPays1(''); setPays2('');
  };

  const nouvelArticle = () => { setEditId(null); resetForm(); setVue('editer'); };

  const editerArticle = (a: Article) => {
    setEditId(a.id); setTitre(a.titre); setType(a.type || 'article'); setLangue(a.langue || 'fr');
    setCategorie(a.categorie); setSourceNom(a.source_nom || ''); setSourceUrl(a.source_url || '');
    setImageCouverture(a.image_couverture || ''); setExtrait(a.extrait || ''); setContenu(a.contenu || '');
    setTags(a.tags || []); setPays1(a.pays1 || ''); setPays2(a.pays2 || '');
    setVue('editer');
  };

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const sauvegarder = async (publier: boolean) => {
    if (!titre) { setMessage('❌ Titre obligatoire.'); return; }
    setSaving(true); setMessage('');
    const payload = {
      titre, type, langue, categorie,
      source_nom: sourceNom || null, source_url: sourceUrl || null,
      tags, pays1: pays1 || null, pays2: pays2 || null,
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

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #333',background:'#1e1e1e',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px',fontWeight:700 as const,textTransform:'uppercase' as const,letterSpacing:'0.5px'};
  const sectionStyle = {background:'#161616',border:'1px solid #2a2a2a',borderRadius:'14px',padding:'20px',marginBottom:'16px'};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#161616',padding:'40px',borderRadius:'20px',width:'100%',maxWidth:'380px',border:'1px solid #2a2a2a'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>📰 Admin Média</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{...inputStyle,marginBottom:'12px'}}/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{...inputStyle,marginBottom:'16px'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'10px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  const btnChoix = (actif: boolean) => ({
    flex:1, padding:'12px', borderRadius:'10px', border:actif?'2px solid '+VIOLET:'1px solid #333',
    background:actif?'#2a1a3a':'#1e1e1e', color:actif?'#fff':'#9ca3af', cursor:'pointer', fontWeight:700, fontSize:'13px'
  });

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',position:'sticky',top:0,zIndex:10}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>📰 Admin Média</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#2a2a2a',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#2a2a2a',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={nouvelArticle} style={{background:vue==='editer'?VIOLET:'#2a2a2a',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'760px',margin:'0 auto',padding:'24px 16px'}}>

        {vue === 'editer' && (
          <div>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'22px',marginBottom:'20px'}}>{editId ? '✏️ Modifier' : '✨ Nouveau contenu'}</h2>

            <div style={sectionStyle}>
              <label style={labelStyle}>Format</label>
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button onClick={() => setType('article')} style={btnChoix(type==='article')}>📄 Article (long)</button>
                <button onClick={() => setType('post')} style={btnChoix(type==='post')}>⚡ Post (bref)</button>
              </div>
              <label style={labelStyle}>Langue</label>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => setLangue('fr')} style={btnChoix(langue==='fr')}>🇫🇷 Français</button>
                <button onClick={() => setLangue('kreyol')} style={btnChoix(langue==='kreyol')}>🇭🇹 Kreyòl</button>
              </div>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Titre *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder={type==='post'?"L'info percutante":"Titre de l'article"} style={{...inputStyle,marginBottom:'16px',fontSize:'16px',fontWeight:700}}/>
              <label style={labelStyle}>Catégorie</label>
              <select value={categorie} onChange={e => setCategorie(e.target.value)} style={inputStyle}>
                <option value="Actualités">Actualités</option>
                <option value="Revue de presse">Revue de presse</option>
                <option value="Ponctuel">Ponctuel</option>
              </select>
            </div>

            {type === 'post' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>⚽ Affiche de match (optionnel)</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 10px'}}>Pour un post "Qui va gagner ?". Tapez les pays, les drapeaux s'afficheront en grand.</p>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <input value={pays1} onChange={e => setPays1(e.target.value)} placeholder="France" style={inputStyle}/>
                  <span style={{color:VIOLET,fontWeight:900}}>VS</span>
                  <input value={pays2} onChange={e => setPays2(e.target.value)} placeholder="Haïti" style={inputStyle}/>
                </div>
              </div>
            )}

            <div style={sectionStyle}>
              <label style={labelStyle}>🏷️ Tags</label>
              {TAGS_GROUPES.map(groupe => (
                <div key={groupe.titre} style={{marginBottom:'14px'}}>
                  <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>{groupe.titre}</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {groupe.tags.map(t => (
                      <button key={t} type="button" onClick={() => toggleTag(t)} style={{
                        padding:'6px 12px', borderRadius:'999px', cursor:'pointer', fontSize:'12px', fontWeight:700,
                        border: tags.includes(t) ? '2px solid '+VIOLET : '1px solid #333',
                        background: tags.includes(t) ? VIOLET : '#1e1e1e',
                        color: tags.includes(t) ? '#fff' : '#9ca3af'
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>📎 Source (optionnel)</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <input value={sourceNom} onChange={e => setSourceNom(e.target.value)} placeholder="Fabrizio Romano, L'Équipe..." style={inputStyle}/>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://... (lien)" style={inputStyle}/>
              </div>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>🖼️ Image {type==='post'?'(optionnelle)':'de couverture'}</label>
              <input type="file" accept="image/*" onChange={uploadImage} style={{...inputStyle,padding:'8px'}}/>
              {uploading && <p style={{color:'#f59e0b',fontSize:'12px',margin:'8px 0 0'}}>⏳ Upload...</p>}
              {imageCouverture && <img src={imageCouverture} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'10px',marginTop:'12px'}}/>}
            </div>

            {type === 'article' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>Extrait (résumé pour la liste)</label>
                <textarea value={extrait} onChange={e => setExtrait(e.target.value)} rows={2} placeholder="Résumé court..." style={{...inputStyle,resize:'vertical'}}/>
              </div>
            )}

            <div style={sectionStyle}>
              <label style={labelStyle}>{type==='post' ? '✍️ Le texte du post' : '✍️ Contenu (Markdown)'}</label>
              {type === 'article' && <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px'}}>## titre, **gras**, *italique*, ![img](url), [lien](url)</p>}
              <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={type==='post'?6:16} placeholder={type==='post'?'Écrivez votre brève percutante...':'Écrivez votre article...'} style={{...inputStyle,resize:'vertical',lineHeight:'1.6',fontFamily:type==='article'?'monospace':'inherit'}}/>
            </div>

            <div style={{display:'flex',gap:'12px',position:'sticky',bottom:'16px'}}>
              <button onClick={() => sauvegarder(false)} disabled={saving} style={{flex:1,padding:'16px',background:'#374151',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>💾 Brouillon</button>
              <button onClick={() => sauvegarder(true)} disabled={saving} style={{flex:2,padding:'16px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:900,fontSize:'15px',cursor:'pointer',boxShadow:'0 4px 16px rgba(191,0,255,0.4)'}}>{saving ? '...' : '🚀 Publier'}</button>
            </div>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {articles.length === 0 && <p style={{color:'#6b7280'}}>Aucun contenu.</p>}
            {articles.map(a => (
              <div key={a.id} style={{background:'#161616',border:'1px solid #2a2a2a',borderRadius:'14px',padding:'16px',marginBottom:'12px',display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                {a.image_couverture && <img src={a.image_couverture} alt={a.titre} style={{width:'80px',height:'60px',objectFit:'cover',borderRadius:'10px'}}/>}
                <div style={{flex:1,minWidth:'200px'}}>
                  <div style={{display:'flex',gap:'6px',marginBottom:'6px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'10px',background:a.type==='post'?VIOLET:'#374151',color:'#fff',padding:'2px 8px',borderRadius:'999px',fontWeight:700}}>{a.type==='post'?'⚡ Post':'📄 Article'}</span>
                    <span style={{fontSize:'10px',background:'#1e1e1e',color:'#fff',padding:'2px 8px',borderRadius:'999px'}}>{a.langue==='kreyol'?'🇭🇹 Kreyòl':'🇫🇷 FR'}</span>
                    <span style={{fontSize:'10px',background:'#1e1e1e',color:'#9ca3af',padding:'2px 8px',borderRadius:'999px'}}>{a.categorie}</span>
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
