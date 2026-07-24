'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';


const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '4-4-2': [
    {x:50,y:92},
    {x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},
    {x:16,y:46},{x:38,y:48},{x:62,y:48},{x:84,y:46},
    {x:38,y:20},{x:62,y:20}
  ],
  '4-3-3': [
    {x:50,y:92},
    {x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},
    {x:30,y:48},{x:50,y:50},{x:70,y:48},
    {x:22,y:22},{x:50,y:18},{x:78,y:22}
  ],
  '4-2-3-1': [
    {x:50,y:92},
    {x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},
    {x:36,y:54},{x:64,y:54},
    {x:22,y:32},{x:50,y:34},{x:78,y:32},
    {x:50,y:14}
  ],
  '3-5-2': [
    {x:50,y:92},
    {x:28,y:74},{x:50,y:76},{x:72,y:74},
    {x:12,y:50},{x:34,y:50},{x:50,y:52},{x:66,y:50},{x:88,y:50},
    {x:38,y:22},{x:62,y:22}
  ],
  '3-4-3': [
    {x:50,y:92},
    {x:28,y:74},{x:50,y:76},{x:72,y:74},
    {x:16,y:50},{x:38,y:50},{x:62,y:50},{x:84,y:50},
    {x:22,y:22},{x:50,y:18},{x:78,y:22}
  ],
  '5-3-2': [
    {x:50,y:92},
    {x:12,y:70},{x:31,y:74},{x:50,y:76},{x:69,y:74},{x:88,y:70},
    {x:30,y:48},{x:50,y:50},{x:70,y:48},
    {x:38,y:22},{x:62,y:22}
  ],
  '4-4-1-1': [
    {x:50,y:92},
    {x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},
    {x:16,y:50},{x:38,y:50},{x:62,y:50},{x:84,y:50},
    {x:50,y:30},
    {x:50,y:12}
  ]
};
const FORMATIONS_LISTE = Object.keys(FORMATIONS);

const DISTINCTIONS = [
  'Ballon d\'or',
  'Joueur du mois', 'Joueur de la semaine', 'Homme du match',
  'Meilleur buteur', 'Meilleur passeur', 'Meilleur gardien',
  'Meilleur jeune / Révélation', 'Meilleur entraîneur', 'MVP du tournoi',
  'Équipe de la semaine', 'Équipe du mois', 'Équipe du tournoi',
  'Meilleure attaque', 'Meilleure défense', 'Équipe fair-play',
  'Autre'
];

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
  ligue: string | null; ligue_logo: string | null;
  equipe1: string | null; equipe2: string | null;
  score1: number | null; score2: number | null; statut_match: string | null;
  distinction_type: string | null; laureat: string | null; distinction_note: string | null; distinction_stats: string | null;
  formation: string | null; onze: { nom: string; equipe: string }[] | null;
  relance_at: string | null;
  classement_type: string | null; classement_titre: string | null;
  classement: { pos: string; nom: string; extra: string; val: string; couleur?: string }[] | null;
  image_couverture: string | null; extrait: string | null; contenu: string | null;
  publie: boolean; created_at: string;
};

export default function AdminMedia() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
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
  const [ligue, setLigue] = useState('');
  const [ligueLogo, setLigueLogo] = useState('');
  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [statutMatch, setStatutMatch] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [distinctionType, setDistinctionType] = useState('');
  const [distinctionAutre, setDistinctionAutre] = useState('');
  const [laureat, setLaureat] = useState('');
  const [distinctionNote, setDistinctionNote] = useState('');
  const [distinctionStats, setDistinctionStats] = useState('');
  const [modePost, setModePost] = useState('simple');
  const [classementType, setClassementType] = useState('');
  const [classementTitre, setClassementTitre] = useState('');
  const [classement, setClassement] = useState<{ pos: string; nom: string; extra: string; val: string; couleur: string }[]>(
    Array.from({length:10},(_,i)=>({pos:String(i+1),nom:'',extra:'',val:'',couleur:''}))
  );
  const [formation, setFormation] = useState('');
  const [onze, setOnze] = useState<{ nom: string; equipe: string }[]>(Array.from({length:11},()=>({nom:'',equipe:''})));

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

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true); setMessage('');
    const nom = 'logo-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { error } = await supabase.storage.from('articles').upload(nom, file);
    if (error) { setMessage('❌ Upload logo : ' + error.message); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from('articles').getPublicUrl(nom);
    setLigueLogo(data.publicUrl);
    setUploadingLogo(false);
    setMessage('✅ Logo uploadé !');
  };

  const resetForm = () => {
    setTitre(''); setType('article'); setLangue('fr'); setCategorie('Actualités');
    setSourceNom(''); setSourceUrl(''); setImageCouverture(''); setExtrait(''); setContenu('');
    setTags([]); setPays1(''); setPays2('');
    setLigue(''); setLigueLogo(''); setEquipe1(''); setEquipe2(''); setScore1(''); setScore2(''); setStatutMatch('');
    setDistinctionType(''); setDistinctionAutre(''); setLaureat(''); setDistinctionNote(''); setDistinctionStats('');
    setFormation(''); setOnze(Array.from({length:11},()=>({nom:'',equipe:''})));
    setModePost('simple'); setClassementType(''); setClassementTitre('');
    setClassement(Array.from({length:10},(_,i)=>({pos:String(i+1),nom:'',extra:'',val:'',couleur:''})));
  };

  const nouvelArticle = () => { setEditId(null); resetForm(); setVue('editer'); };

  const editerArticle = (a: Article) => {
    setEditId(a.id); setTitre(a.titre); setType(a.type || 'article'); setLangue(a.langue || 'fr');
    setCategorie(a.categorie); setSourceNom(a.source_nom || ''); setSourceUrl(a.source_url || '');
    setImageCouverture(a.image_couverture || ''); setExtrait(a.extrait || ''); setContenu(a.contenu || '');
    setTags(a.tags || []); setPays1(a.pays1 || ''); setPays2(a.pays2 || '');
    setLigue(a.ligue || ''); setLigueLogo(a.ligue_logo || '');
    setEquipe1(a.equipe1 || ''); setEquipe2(a.equipe2 || '');
    setScore1(a.score1 !== null && a.score1 !== undefined ? String(a.score1) : '');
    setScore2(a.score2 !== null && a.score2 !== undefined ? String(a.score2) : '');
    setStatutMatch(a.statut_match || '');
    const dt = a.distinction_type || '';
    if (dt && !DISTINCTIONS.includes(dt)) { setDistinctionType('Autre'); setDistinctionAutre(dt); }
    else { setDistinctionType(dt); setDistinctionAutre(''); }
    setLaureat(a.laureat || ''); setDistinctionNote(a.distinction_note || ''); setDistinctionStats(a.distinction_stats || '');
    if (a.formation) setModePost('onze');
    else if (a.classement_type) setModePost('classement');
    else if (a.distinction_type) setModePost('distinction');
    else if (a.pays1 || a.equipe1 || a.ligue) setModePost('match');
    else setModePost('simple');
    setClassementType(a.classement_type || ''); setClassementTitre(a.classement_titre || '');
    if (a.classement && Array.isArray(a.classement) && a.classement.length > 0) setClassement(a.classement.map(l => ({...l, couleur: l.couleur || ''})));
    else setClassement(Array.from({length:10},(_,i)=>({pos:String(i+1),nom:'',extra:'',val:'',couleur:''})));
    setFormation(a.formation || '');
    if (a.onze && Array.isArray(a.onze) && a.onze.length === 11) setOnze(a.onze);
    else setOnze(Array.from({length:11},()=>({nom:'',equipe:''})));
    setVue('editer');
  };

  const setLigne = (i: number, champ: 'pos' | 'nom' | 'extra' | 'val' | 'couleur', val: string) => {
    setClassement(prev => prev.map((l, idx) => idx === i ? { ...l, [champ]: val } : l));
  };

  const ajouterLigne = () => setClassement(prev => [...prev, { pos: String(prev.length+1), nom:'', extra:'', val:'', couleur:'' }]);

  const COULEURS_LIGNE = [
    { cle: '', label: '—', hex: 'transparent' },
    { cle: 'vert', label: 'Qualifié', hex: '#10b981' },
    { cle: 'orange', label: 'Barrage', hex: '#f59e0b' },
    { cle: 'rouge', label: 'Éliminé', hex: '#ef4444' },
  ];

  const setJoueur = (i: number, champ: 'nom' | 'equipe', val: string) => {
    setOnze(prev => prev.map((j, idx) => idx === i ? { ...j, [champ]: val } : j));
  };

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const sauvegarder = async (publier: boolean) => {
    if (!titre) { setMessage('❌ Titre obligatoire.'); return; }
    setSaving(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setSaving(false);
      setMessage('❌ Session expirée. Reconnectez-vous.');
      setConnecte(false);
      return;
    }
    const payload = {
      titre, type, langue, categorie,
      source_nom: sourceNom || null, source_url: sourceUrl || null,
      tags, pays1: pays1 || null, pays2: pays2 || null,
      ligue: ligue || null, ligue_logo: ligueLogo || null,
      equipe1: equipe1 || null, equipe2: equipe2 || null,
      score1: score1 !== '' ? parseInt(score1) : null,
      score2: score2 !== '' ? parseInt(score2) : null,
      statut_match: statutMatch || null,
      statut_change_at: statutMatch ? new Date().toISOString() : null,
      distinction_type: distinctionType === 'Autre' ? (distinctionAutre || null) : (distinctionType || null),
      laureat: laureat || null,
      distinction_note: distinctionNote || null,
      distinction_stats: distinctionStats || null,
      formation: formation || null,
      onze: formation ? onze : null,
      classement_type: classementType || null,
      classement_titre: classementTitre || null,
      classement: classementType ? classement.filter(l => l.nom) : null,
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

  const relancer = async (a: Article) => {
    await supabase.from('articles').update({ relance_at: new Date().toISOString(), publie: true }).eq('id', a.id);
    setMessage('✅ Post relancé pour 1 semaine !');
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
          <div style={{position:'relative',marginBottom:'16px'}}>
            <input type={voirMdp ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{...inputStyle,paddingRight:'44px'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
            <button type="button" onClick={() => setVoirMdp(v => !v)} style={{position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>{voirMdp ? '🙈' : '👁️'}</button>
          </div>
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
              <div style={{display:'flex',gap:'8px',marginBottom: type === 'post' ? '16px' : '0'}}>
                <button onClick={() => setLangue('fr')} style={btnChoix(langue==='fr')}>🇫🇷 Français</button>
                <button onClick={() => setLangue('kreyol')} style={btnChoix(langue==='kreyol')}>🇭🇹 Kreyòl</button>
              </div>

              {type === 'post' && (
                <>
                  <label style={labelStyle}>Type de post</label>
                  <select value={modePost} onChange={e => setModePost(e.target.value)} style={inputStyle}>
                    <option value="simple">✍️ Simple (texte / image)</option>
                    <option value="match">⚽ Affiche de match</option>
                    <option value="distinction">🏆 Distinction</option>
                    <option value="classement">📊 Classement</option>
                    <option value="onze">👥 Onze type</option>
                  </select>
                </>
              )}
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Titre *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder={type==='post'?"L'info percutante":"Titre de l'article"} style={{...inputStyle,marginBottom:'16px',fontSize:'16px',fontWeight:700}}/>
              <label style={labelStyle}>Catégorie</label>
              <select value={categorie} onChange={e => setCategorie(e.target.value)} style={inputStyle}>
                <option value="Actualités">Actualités</option>
                <option value="Revue de presse">Revue de presse</option>
                <option value="Ponctuel">Ponctuel</option>
                <option value="Classement">Classement</option>
              </select>
            </div>

            {type === 'post' && modePost === 'match' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>⚽ Affiche de match</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Pour un post match. Remplissez ce que vous voulez afficher.</p>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Ligue / compétition</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center'}}>
                  <input value={ligue} onChange={e => setLigue(e.target.value)} placeholder="Ligue des Champions" style={inputStyle}/>
                  <label style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'12px',cursor:'pointer',whiteSpace:'nowrap',color:'#9ca3af',fontSize:'12px',fontWeight:700}}>
                    {uploadingLogo ? '⏳' : '🖼️ Logo'}
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{display:'none'}}/>
                  </label>
                </div>
                {ligueLogo && <img src={ligueLogo} alt="logo ligue" style={{height:'40px',marginBottom:'14px',borderRadius:'6px'}}/>}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Sélections (drapeaux auto) OU équipes/clubs (noms)</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
                  <input value={pays1} onChange={e => setPays1(e.target.value)} placeholder="Pays 1 (ex: France)" style={inputStyle}/>
                  <span style={{color:VIOLET,fontWeight:900,fontSize:'12px'}}>VS</span>
                  <input value={pays2} onChange={e => setPays2(e.target.value)} placeholder="Pays 2 (ex: Haïti)" style={inputStyle}/>
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center'}}>
                  <input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="OU Club 1 (ex: PSG)" style={inputStyle}/>
                  <span style={{color:VIOLET,fontWeight:900,fontSize:'12px'}}>VS</span>
                  <input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="OU Club 2 (ex: Real)" style={inputStyle}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Score (laisser vide si pas encore joué)</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center',justifyContent:'center'}}>
                  <input type="number" value={score1} onChange={e => setScore1(e.target.value)} placeholder="0" style={{...inputStyle,width:'70px',textAlign:'center',fontSize:'18px',fontWeight:900}}/>
                  <span style={{color:VIOLET,fontWeight:900,fontSize:'18px'}}>-</span>
                  <input type="number" value={score2} onChange={e => setScore2(e.target.value)} placeholder="0" style={{...inputStyle,width:'70px',textAlign:'center',fontSize:'18px',fontWeight:900}}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Statut</p>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {['', 'À venir', 'Mi-temps', 'Match terminé'].map(s => (
                    <button key={s || 'aucun'} type="button" onClick={() => setStatutMatch(s)} style={{
                      padding:'8px 14px', borderRadius:'999px', cursor:'pointer', fontSize:'12px', fontWeight:700,
                      border: statutMatch === s ? '2px solid '+VIOLET : '1px solid #333',
                      background: statutMatch === s ? VIOLET : '#1e1e1e',
                      color: statutMatch === s ? '#fff' : '#9ca3af'
                    }}>{s === '' ? 'Aucun' : s}</button>
                  ))}
                </div>
              </div>
            )}

            {type === 'post' && modePost === 'distinction' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>🏆 Distinction</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Pour un post récompense : joueur du mois, équipe de la semaine...</p>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Type de distinction</p>
                <select value={distinctionType} onChange={e => setDistinctionType(e.target.value)} style={{...inputStyle,marginBottom:'12px'}}>
                  <option value="">— Aucune —</option>
                  {DISTINCTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {distinctionType === 'Autre' && (
                  <input value={distinctionAutre} onChange={e => setDistinctionAutre(e.target.value)} placeholder="Votre distinction (ex: Meilleur gardien de la CAN)" style={{...inputStyle,marginBottom:'12px'}}/>
                )}

                {distinctionType && (
                  <>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Lauréat (joueur ou équipe)</p>
                    <input value={laureat} onChange={e => setLaureat(e.target.value)} placeholder="Nom du joueur ou de l'équipe" style={{...inputStyle,marginBottom:'12px'}}/>

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Stats / chiffres (optionnel)</p>
                    <input value={distinctionStats} onChange={e => setDistinctionStats(e.target.value)} placeholder="Ex: 12 buts, 5 passes décisives" style={{...inputStyle,marginBottom:'12px'}}/>

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Note / justification (optionnel)</p>
                    <textarea value={distinctionNote} onChange={e => setDistinctionNote(e.target.value)} rows={2} placeholder="Pourquoi cette distinction..." style={{...inputStyle,resize:'vertical'}}/>
                  </>
                )}
              </div>
            )}

            {type === 'post' && modePost === 'classement' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📊 Classement</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Classement d'équipes (groupe, FIFA, championnat) ou de joueurs (buteurs, passeurs).</p>

                <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                  <button type="button" onClick={() => setClassementType('')} style={btnChoix(classementType==='')}>Aucun</button>
                  <button type="button" onClick={() => setClassementType('equipes')} style={btnChoix(classementType==='equipes')}>🛡️ Équipes</button>
                  <button type="button" onClick={() => setClassementType('joueurs')} style={btnChoix(classementType==='joueurs')}>👤 Joueurs</button>
                </div>

                {classementType && (
                  <div>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Titre du classement</p>
                    <input value={classementTitre} onChange={e => setClassementTitre(e.target.value)} placeholder={classementType==='equipes'?'Ex: Groupe A / Classement FIFA':'Ex: Meilleurs buteurs Ligue 1'} style={{...inputStyle,marginBottom:'14px'}}/>

                    <div style={{display:'flex',gap:'6px',marginBottom:'6px',fontSize:'10px',color:'#6b7280',fontWeight:700,textTransform:'uppercase'}}>
                      <span style={{width:'34px'}}>Pos</span>
                      <span style={{flex:2}}>{classementType==='equipes'?'Équipe':'Joueur'}</span>
                      <span style={{flex:1.5}}>{classementType==='equipes'?'Joués':'Équipe'}</span>
                      <span style={{flex:1}}>{classementType==='equipes'?'Points':'Buts/Passes'}</span>
                    </div>

                    {classement.map((l, i) => (
                      <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                        <div style={{display:'flex',gap:'2px'}}>
                          {COULEURS_LIGNE.map(col => (
                            <button key={col.cle} type="button" title={col.label} onClick={() => setLigne(i,'couleur',col.cle)} style={{
                              width:'16px',height:'26px',borderRadius:'4px',cursor:'pointer',padding:0,
                              background: col.hex === 'transparent' ? '#1e1e1e' : col.hex,
                              border: l.couleur === col.cle ? '2px solid #fff' : '1px solid #333'
                            }}/>
                          ))}
                        </div>
                        <input value={l.pos} onChange={e => setLigne(i,'pos',e.target.value)} style={{...inputStyle,width:'34px',padding:'8px 4px',textAlign:'center'}}/>
                        <input value={l.nom} onChange={e => setLigne(i,'nom',e.target.value)} placeholder={classementType==='equipes'?'Équipe':'Joueur'} style={{...inputStyle,flex:2,padding:'8px'}}/>
                        <input value={l.extra} onChange={e => setLigne(i,'extra',e.target.value)} placeholder={classementType==='equipes'?'Joués':'Équipe'} style={{...inputStyle,flex:1.5,padding:'8px'}}/>
                        <input value={l.val} onChange={e => setLigne(i,'val',e.target.value)} placeholder={classementType==='equipes'?'Pts':'Nb'} style={{...inputStyle,flex:1,padding:'8px'}}/>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:'12px',marginTop:'10px',flexWrap:'wrap'}}>
                      {COULEURS_LIGNE.filter(c2 => c2.cle).map(col => (
                        <span key={col.cle} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#9ca3af'}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'2px',background:col.hex,display:'inline-block'}}/>{col.label}
                        </span>
                      ))}
                    </div>
                    <button type="button" onClick={ajouterLigne} style={{marginTop:'10px',padding:'8px 16px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>+ Ajouter une ligne</button>
                  </div>
                )}
              </div>
            )}

            {type === 'post' && modePost === 'onze' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>👥 Onze type</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Équipe de la semaine / du tournoi. Choisissez la formation puis remplissez les 11 joueurs.</p>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Formation</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'16px'}}>
                  <button type="button" onClick={() => setFormation('')} style={{padding:'8px 14px',borderRadius:'999px',cursor:'pointer',fontSize:'12px',fontWeight:700,border:formation===''?'2px solid '+VIOLET:'1px solid #333',background:formation===''?VIOLET:'#1e1e1e',color:formation===''?'#fff':'#9ca3af'}}>Aucune</button>
                  {FORMATIONS_LISTE.map(f => (
                    <button key={f} type="button" onClick={() => setFormation(f)} style={{padding:'8px 14px',borderRadius:'999px',cursor:'pointer',fontSize:'12px',fontWeight:700,border:formation===f?'2px solid '+VIOLET:'1px solid #333',background:formation===f?VIOLET:'#1e1e1e',color:formation===f?'#fff':'#9ca3af'}}>{f}</button>
                  ))}
                </div>

                {formation && (
                  <div>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Les 11 joueurs (n°1 = gardien)</p>
                    {onze.map((j, i) => (
                      <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                        <span style={{color:VIOLET,fontWeight:900,fontSize:'13px',width:'22px'}}>{i+1}</span>
                        <input value={j.nom} onChange={e => setJoueur(i,'nom',e.target.value)} placeholder="Joueur" style={{...inputStyle,flex:2}}/>
                        <input value={j.equipe} onChange={e => setJoueur(i,'equipe',e.target.value)} placeholder="Équipe / Pays" style={{...inputStyle,flex:2}}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={sectionStyle}>
              <label style={labelStyle}>🏷️ Tags</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {TAGS_GROUPES.map(groupe => (
                  <div key={groupe.titre}>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>{groupe.titre}</p>
                    <select value="" onChange={e => { if (e.target.value) toggleTag(e.target.value); }} style={{...inputStyle,padding:'10px'}}>
                      <option value="">+ Ajouter…</option>
                      {groupe.tags.filter(t => !tags.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {tags.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'12px'}}>
                  {tags.map(t => (
                    <button key={t} type="button" onClick={() => toggleTag(t)} title="Retirer" style={{
                      padding:'6px 12px', borderRadius:'999px', cursor:'pointer', fontSize:'12px', fontWeight:700,
                      border:'2px solid '+VIOLET, background:VIOLET, color:'#fff'
                    }}>{t} ✕</button>
                  ))}
                </div>
              )}
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
                  {a.type === 'post' && a.categorie === 'Ponctuel' && <button onClick={() => relancer(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid #f59e0b',background:'transparent',color:'#f59e0b',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>🔄 Relancer</button>}
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
