'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const VIOLET = '#bf00ff';
const NIVEAUX = ['Classique', 'Simple', 'Complexe', 'Divin'];
const CATEGORIES = [
  'Résultat', 'Double chance', 'Buts', 'Trophée',
  'Tirs', 'Tirs cadrés', 'Corners', 'Cartons',
  'Hors-jeu', 'Buteur', 'Premier buteur', 'Score exact'
];

type Pari = {
  niveau: string;
  categorie: string;
  type_pari: string;
  valeur: string;
  cote: number | null;
  confiance: number | null;
  ordre: number;
};

type PronosticExistant = {
  id: string;
  match: string;
  date_match: string;
  publie: boolean;
  confiance_globale: number;
};

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [vue, setVue] = useState<'dashboard' | 'nouveau'>('dashboard');
  const [pronostics, setPronostics] = useState<PronosticExistant[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [match, setMatch] = useState('');
  const [competition, setCompetition] = useState('');
  const [dateMatch, setDateMatch] = useState('');
  const [lieu, setLieu] = useState('');
  const [contexte, setContexte] = useState('');
  const [confiance, setConfiance] = useState(3);
  const [paris, setParis] = useState<Pari[]>([]);
  const [pariActuel, setPariActuel] = useState<Pari>({
    niveau: 'Classique', categorie: 'Résultat', type_pari: '',
    valeur: '', cote: null, confiance: null, ordre: 0
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setConnecte(true);
    });
  }, []);

  useEffect(() => {
    if (connecte) chargerPronostics();
  }, [connecte]);

  const chargerPronostics = async () => {
    const { data } = await supabase
      .from('pronostics')
      .select('id, match, date_match, publie, confiance_globale')
      .order('date_match', { ascending: false });
    if (data) setPronostics(data);
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErreurAuth('Email ou mot de passe incorrect.');
    } else {
      setConnecte(true);
    }
  };

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    setConnecte(false);
  };

  const ajouterPari = () => {
    if (!pariActuel.valeur) return;
    setParis([...paris, { ...pariActuel, ordre: paris.length + 1 }]);
    setPariActuel({ niveau: 'Classique', categorie: 'Résultat', type_pari: '', valeur: '', cote: null, confiance: null, ordre: 0 });
  };

  const supprimerPari = (index: number) => {
    setParis(paris.filter((_, i) => i !== index));
  };

  const sauvegarder = async (publier: boolean) => {
    if (!match || !dateMatch) {
      setMessage('Match et date obligatoires.');
      return;
    }
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/pronostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match, competition, date_match: dateMatch,
        lieu, contexte, confiance_globale: confiance,
        paris
      })
    });
    const data = await res.json();
    if (data.success && publier) {
      await fetch('/api/admin/pronostic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.id, publie: true })
      });
    }
    setSaving(false);
    if (data.success) {
      setMessage(publier ? 'Pronostic publié !' : 'Brouillon sauvegardé !');
      setMatch(''); setCompetition(''); setDateMatch('');
      setLieu(''); setContexte(''); setConfiance(3); setParis([]);
      chargerPronostics();
      setTimeout(() => setVue('dashboard'), 1500);
    } else {
      setMessage('Erreur : ' + (data.error || 'inconnue'));
    }
  };const togglePublie = async (id: string, publie: boolean) => {
    await fetch('/api/admin/pronostic', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, publie: !publie })
    });
    chargerPronostics();
  };

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>MakeGoal Admin</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
          />
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>MakeGoal Admin</h1>
        <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
          {vue === 'nouveau' && (
            <button onClick={() => setVue('dashboard')} style={{background:'#333',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
              ← Dashboard
            </button>
          )}
          <button onClick={seDeconnecter} style={{background:'#ef4444',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
            Déconnexion
          </button>
        </div>
      </header>

      {vue === 'dashboard' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
            <h2 style={{fontWeight:900,fontSize:'24px',margin:0}}>Pronostics</h2>
            <button onClick={() => setVue('nouveau')} style={{background:VIOLET,color:'#fff',border:'none',padding:'10px 24px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>
              + Nouveau
            </button>
          </div>
          {pronostics.length === 0 && <p style={{color:'#6b7280'}}>Aucun pronostic.</p>}
          {pronostics.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'16px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <div>
                <p style={{fontWeight:700,margin:0,marginBottom:'4px'}}>{p.match}</p><p style={{color:'#6b7280',fontSize:'13px',margin:0}}>{new Date(p.date_match).toLocaleDateString('fr-FR')} — Confiance : {'★'.repeat(p.confiance_globale)}</p>
              </div>
              <button
                onClick={() => togglePublie(p.id, p.publie)}
                style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',
                  background: p.publie ? '#10b981' : '#6b7280',color:'#fff'
                }}
              >
                {p.publie ? '✓ Publié' : 'Brouillon'}
              </button>
            </div>
          ))}
        </main>
      )}

      {vue === 'nouveau' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <h2 style={{fontWeight:900,fontSize:'24px',marginBottom:'24px'}}>Nouveau pronostic</h2>
          {message && <p style={{color: message.includes('Erreur') ? '#ef4444' : '#10b981',fontWeight:700,marginBottom:'16px'}}>{message}</p>}

          <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>Informations du match</h3>
            {[
              { label: 'Match *', value: match, set: setMatch, placeholder: 'PSG vs Arsenal' },
              { label: 'Compétition', value: competition, set: setCompetition, placeholder: 'Champions League' },
              { label: 'Lieu', value: lieu, set: setLieu, placeholder: 'Stade de France, Paris' },
            ].map(f => (
              <div key={f.label} style={{marginBottom:'12px'}}>
                <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                />
              </div>
            ))}
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Date et heure *</label>
              <input type="datetime-local" value={dateMatch} onChange={e => setDateMatch(e.target.value)}
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
              />
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Contexte / Analyse</label>
              <textarea value={contexte} onChange={e => setContexte(e.target.value)} rows={4} placeholder="Analyse du match..."
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box',resize:'vertical'}}
              />
            </div>
            <div>
              <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'8px'}}>Confiance globale : {'★'.repeat(confiance) + '☆'.repeat(5 - confiance)}</label>
              <input type="range" min={1} max={5} value={confiance} onChange={e => setConfiance(Number(e.target.value))}
                style={{width:'100%'}}
              />
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>Ajouter un pari</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Niveau</label><select value={pariActuel.niveau} onChange={e => setPariActuel({...pariActuel, niveau: e.target.value})}
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px'}}>
                  {NIVEAUX.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Catégorie</label>
                <select value={pariActuel.categorie} onChange={e => setPariActuel({...pariActuel, categorie: e.target.value})}
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px'}}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Valeur du pari *</label>
              <input value={pariActuel.valeur} onChange={e => setPariActuel({...pariActuel, valeur: e.target.value})}
                placeholder="Ex: Victoire PSG, Over 2.5 buts, Dembélé buteur..."
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
              />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Cote</label>
                <input type="number" step="0.01" value={pariActuel.cote || ''} onChange={e => setPariActuel({...pariActuel, cote: Number(e.target.value)})}
                  placeholder="2.39"
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'13px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Confiance (1-5)</label>
                <input type="number" min={1} max={5} value={pariActuel.confiance || ''} onChange={e => setPariActuel({...pariActuel, confiance: Number(e.target.value)})}
                  placeholder="4"
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                />
              </div>
            </div>
            <button onClick={ajouterPari} style={{background:'#111',color:'#fff',border:'none',padding:'10px 24px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>
              + Ajouter ce pari
            </button>
          </div>

          {paris.length > 0 && (
            <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
              <h3 style={{fontWeight:700,marginBottom:'12px',fontSize:'16px'}}>{paris.length} paris ajoutés</h3>
              {paris.map((p, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
                  <div>
                    <span style={{fontSize:'12px',color:'#6b7280',marginRight:'8px'}}>[{p.niveau}] {p.categorie}</span>
                    <span style={{fontWeight:600,fontSize:'14px'}}>{p.valeur}</span>
                    {p.cote && <span style={{color:VIOLET,fontWeight:700,marginLeft:'8px'}}>{p.cote.toFixed(2)}</span>}
                  </div>
                  <button onClick={() => supprimerPari(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'18px'}}>×</button>
                </div>
              ))}
            </div>
          )}<div style={{display:'flex',gap:'12px'}}>
            <button onClick={() => sauvegarder(false)} disabled={saving}
              style={{flex:1,padding:'14px',background:'#6b7280',color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>
              Brouillon
            </button>
            <button onClick={() => sauvegarder(true)} disabled={saving}
              style={{flex:1,padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>
              {saving ? '...' : 'Publier'}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}