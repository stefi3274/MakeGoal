'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const VIOLET = '#bf00ff';

const NIVEAUX = [
  { key: 'Kiyès k ap bat ?', emoji: '⚽', color: '#10b981' },
  { key: 'Bèl ti stat', emoji: '📊', color: '#3b82f6' },
  { key: 'Kiyès k ap fè Gòl ?', emoji: '🎯', color: '#f59e0b' },
  { key: 'Divinò', emoji: '🔮', color: '#eab308' },
  { key: 'Bèl Mirak', emoji: '🌈', color: '#8b00ff' },
];

const CATEGORIES: Record<string, string[]> = {
  'Kiyès k ap bat ?': ['Résultat', 'Double Chance', 'Trophée'],
  'Bèl ti stat': ['Tir', 'Tir cadré', 'Corners', 'Carton Jaune', 'Carton Rouge', 'Hors-jeu', 'Touche'],
  'Kiyès k ap fè Gòl ?': ['Buts total', 'Buts Équipe 1', 'Buts Équipe 2', 'BTTS'],
  'Divinò': ['Buteur', 'Premier Buteur', 'Score exact'],
  'Bèl Mirak': ['Victoire Surprise', 'Buts Outsider'],
};

const STATS_CATS = ['Tir', 'Tir cadré', 'Corners', 'Carton Jaune', 'Carton Rouge', 'Hors-jeu', 'Touche', 'Buts total', 'Buts Équipe 1', 'Buts Équipe 2', 'Buts Outsider'];

type Pari = {
  niveau: string;
  categorie: string;
  type_pari: string;
  valeur: string;
  cote: number | null;
  confiance: number | null;
  ordre: number;
  plusMoins?: 'plus' | 'moins' | null;
  seuil?: string;
};

type PronosticExistant = {
  id: string;
  match: string;
  date_match: string;
  publie: boolean;
  confiance_globale: number;
};

const coteToPct = (cote: number | null) => {
  if (!cote || cote <= 0) return '-';
  return Math.round((1 / cote) * 100) + '%';
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
  const [analysing, setAnalysing] = useState(false);

  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [competition, setCompetition] = useState('');
  const [dateMatch, setDateMatch] = useState('');
  const [lieu, setLieu] = useState('');
  const [contexte, setContexte] = useState('');
  const [confiance, setConfiance] = useState(3);
  const [paris, setParis] = useState<Pari[]>([]);

  const [niveauActuel, setNiveauActuel] = useState('Kiyès k ap bat ?');
  const [categorieActuelle, setCategorieActuelle] = useState('Rezilta');
  const [valeurLibre, setValeurLibre] = useState('');
  const [coteActuelle, setCoteActuelle] = useState('');
  const [confianceActuelle, setConfianceActuelle] = useState(3);
  const [plusMoins, setPlusMoins] = useState<'plus' | 'moins'>('plus');
  const [seuil, setSeuil] = useState('');
  const [unite, setUnite] = useState('');

  const matchNom = equipe1 && equipe2 ? equipe1 + ' vs ' + equipe2 : '';
  const estStat = STATS_CATS.includes(categorieActuelle);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setConnecte(true);
    });
  }, []);

  useEffect(() => {
    if (connecte) chargerPronostics();
  }, [connecte]);

  useEffect(() => {
    const cats = CATEGORIES[niveauActuel];
    if (cats && !cats.includes(categorieActuelle)) {
      setCategorieActuelle(cats[0]);
    }
  }, [niveauActuel]);

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
    if (error) setErreurAuth('Email ou mot de passe incorrect.');
    else setConnecte(true);
  };

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    setConnecte(false);
  };const construireValeur = () => {
    if (estStat) {
      const pm = plusMoins === 'plus' ? 'Plus de' : 'Moins de';
      const u = unite ? ' ' + unite : '';
      const eq = categorieActuelle.includes('Ekip 1') ? ' ' + (equipe1 || 'Ekip 1')
        : categorieActuelle.includes('Ekip 2') ? ' ' + (equipe2 || 'Ekip 2')
        : categorieActuelle.includes('ADS') ? ' ' + (equipe2 || 'Ekip 2')
        : '';
      return pm + ' ' + seuil + u + ' ' + categorieActuelle.toLowerCase() + eq;
    }
    return valeurLibre;
  };

  const ajouterPari = () => {
    const valeur = construireValeur();
    if (!valeur.trim()) return;
    const cote = coteActuelle ? parseFloat(coteActuelle) : null;
    setParis([...paris, {
      niveau: niveauActuel,
      categorie: categorieActuelle,
      type_pari: categorieActuelle,
      valeur: valeur.trim(),
      cote,
      confiance: confianceActuelle,
      ordre: paris.length + 1,
      plusMoins: estStat ? plusMoins : null,
      seuil: estStat ? seuil : undefined,
    }]);
    setValeurLibre('');
    setCoteActuelle('');
    setSeuil('');
    setUnite('');
  };

  const supprimerPari = (index: number) => {
    setParis(paris.filter((_, i) => i !== index));
  };

  const analyserAvecIA = async () => {
    if (!matchNom) { setMessage('Entre les deux équipes avant.'); return; }
    setAnalysing(true); setMessage('');
    try {
      const res = await fetch('/api/admin/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: matchNom, competition, date_match: dateMatch })
      });
      const data = await res.json();
      if (data.success && data.analyse) {
        setContexte(data.analyse.contexte || '');
        setConfiance(data.analyse.confiance_globale || 3);
        if (data.analyse.paris?.length > 0) {
          setParis(data.analyse.paris.map((p: Pari, i: number) => ({ ...p, ordre: i + 1 })));
        }
        setMessage('✅ Analiz IA fini ! Verifye anvan w pibliye.');
      } else {
        setMessage('❌ Erè IA : ' + (data.error || 'enkoni'));
      }
    } catch { setMessage('❌ Erè koneksyon IA.'); }
    setAnalysing(false);
  };

  const sauvegarder = async (publier: boolean) => {
    if (!matchNom || !dateMatch) { setMessage('De ekip ak dat obligatwa.'); return; }
    setSaving(true); setMessage('');
    const res = await fetch('/api/admin/pronostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match: matchNom, competition, date_match: dateMatch,
        lieu, contexte, confiance_globale: confiance, paris
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
      setMessage(publier ? '✅ Pibliye !' : '✅ Bouyon sovgade !');
      setEquipe1(''); setEquipe2(''); setCompetition(''); setDateMatch('');
      setLieu(''); setContexte(''); setConfiance(3); setParis([]);
      chargerPronostics();
      setTimeout(() => setVue('dashboard'), 1500);
    } else {
      setMessage('❌ Erè : ' + (data.error || 'enkoni'));
    }
  };

  const togglePublie = async (id: string, publie: boolean) => {
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
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}><h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>MakeGoal Admin</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Aksè rezève</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}
          />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
          />
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>
            Konekte
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
            Dekonekte
          </button>
        </div>
      </header>

      {vue === 'dashboard' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
            <h2 style={{fontWeight:900,fontSize:'24px',margin:0}}>Pwonostic yo</h2>
            <button onClick={() => setVue('nouveau')} style={{background:VIOLET,color:'#fff',border:'none',padding:'10px 24px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>
              + Nouvo
            </button>
          </div>
          {pronostics.length === 0 && <p style={{color:'#6b7280'}}>Poko gen pwonostic.</p>}
          {pronostics.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'16px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <div>
                <p style={{fontWeight:700,margin:0,marginBottom:'4px'}}>{p.match}</p>
                <p style={{color:'#6b7280',fontSize:'13px',margin:0}}>{new Date(p.date_match).toLocaleDateString('fr-FR')} — {'★'.repeat(p.confiance_globale)}</p>
              </div>
              <button onClick={() => togglePublie(p.id, p.publie)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:p.publie?'#10b981':'#6b7280',color:'#fff'}}>
                {p.publie ? '✓ Pibliye' : 'Bouyon'}
              </button>
            </div>
          ))}
        </main>
      )}

      {vue === 'nouveau' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <h2 style={{fontWeight:900,fontSize:'24px',marginBottom:'24px'}}>Nouvo Pwonostic</h2>{message && (
            <div style={{padding:'12px 16px',borderRadius:'8px',marginBottom:'16px',background:message.includes('❌')?'#fef2f2':'#f0fdf4',color:message.includes('❌')?'#ef4444':'#10b981',fontWeight:700}}>
              {message}
            </div>
          )}

          <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>⚽ De Ekip yo</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'12px',alignItems:'center',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Ekip 1 (Lakay) *</label>
                <input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="Mexique"
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box',fontWeight:600}}
                />
              </div>
              <div style={{textAlign:'center',fontWeight:900,fontSize:'20px',color:'#9ca3af',paddingTop:'20px'}}>VS</div>
              <div>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Ekip 2 (Deplase) *</label>
                <input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Afrique du Sud"
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box',fontWeight:600}}
                />
              </div>
            </div>
            {matchNom && (
              <div style={{background:'#faf5ff',border:'1px solid ' + VIOLET,borderRadius:'8px',padding:'10px',textAlign:'center',marginBottom:'12px'}}>
                <span style={{color:VIOLET,fontWeight:900,fontSize:'16px'}}>{matchNom}</span>
              </div>
            )}
            {[
              { label: 'Konpetisyon', value: competition, set: setCompetition, placeholder: 'FIFA World Cup 2026 — Groupe A' },
              { label: 'Kote (Stad)', value: lieu, set: setLieu, placeholder: 'Estadio Azteca, Mexico City' },
            ].map(f => (
              <div key={f.label} style={{marginBottom:'12px'}}>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                />
              </div>
            ))}
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Dat ak lè *</label>
              <input type="datetime-local" value={dateMatch} onChange={e => setDateMatch(e.target.value)}
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
              />
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Kontèks / Analiz</label>
              <textarea value={contexte} onChange={e => setContexte(e.target.value)} rows={4}
                placeholder="Analiz match lan..."
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box',resize:'vertical'}}
              />
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'8px'}}>Konfyans global : {'★'.repeat(confiance) + '☆'.repeat(5 - confiance)}
              </label>
              <input type="range" min={1} max={5} value={confiance} onChange={e => setConfiance(Number(e.target.value))} style={{width:'100%'}}/>
            </div>
            <button onClick={analyserAvecIA} disabled={analysing || !matchNom}
              style={{width:'100%',padding:'12px',background:analysing?'#9ca3af':'#111',color:'#fff',border:'none',borderRadius:'8px',cursor:analysing?'not-allowed':'pointer',fontWeight:700,fontSize:'14px'}}>
              {analysing ? '🤖 Analiz ap fèt...' : '🤖 Analize ak IA (opsyonèl)'}
            </button>
          </div>

          <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>➕ Ajoute yon Pari</h3>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Nivo</label>
                <select value={niveauActuel} onChange={e => setNiveauActuel(e.target.value)}
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px'}}>
                  {NIVEAUX.map(n => <option key={n.key}>{n.emoji} {n.key}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Kategori</label>
                <select value={categorieActuelle} onChange={e => setCategorieActuelle(e.target.value)}
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px'}}>
                  {(CATEGORIES[niveauActuel] || []).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {estStat ? (
              <div style={{marginBottom:'12px'}}>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'8px'}}>Pari stat</label>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  <button onClick={() => setPlusMoins('plus')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'2px solid ' + (plusMoins==='plus'?'#10b981':'#e5e7eb'),background:plusMoins==='plus'?'#f0fdf4':'#fff',color:plusMoins==='plus'?'#10b981':'#6b7280',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                    Plus de ↑
                  </button>
                  <button onClick={() => setPlusMoins('moins')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'2px solid ' + (plusMoins==='moins'?'#ef4444':'#e5e7eb'),background:plusMoins==='moins'?'#fef2f2':'#fff',color:plusMoins==='moins'?'#ef4444':'#6b7280',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                    Moins de ↓
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div>
                    <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Sèy (ex: 2.5)</label>
                    <input type="number" step="0.5" value={seuil} onChange={e => setSeuil(e.target.value)} placeholder="2.5"
                      style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                    />
                  </div>
                  <div>
                    <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Inite (opsyonèl)</label>
                    <input value={unite} onChange={e => setUnite(e.target.value)} placeholder="buts, tirs..."style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                    />
                  </div>
                </div>
                {seuil && (
                  <div style={{marginTop:'8px',padding:'8px 12px',background:'#f9fafb',borderRadius:'8px',fontSize:'13px',color:'#374151'}}>
                    Aperçu : <strong>{construireValeur()}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div style={{marginBottom:'12px'}}>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Valè pari *</label>
                <input value={valeurLibre} onChange={e => setValeurLibre(e.target.value)}
                  placeholder="Ex: Viktwa Mexique, Jiménez make gòl..."
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                />
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Cote (ex: 1.43)</label>
                <input type="number" step="0.01" value={coteActuelle} onChange={e => setCoteActuelle(e.target.value)} placeholder="1.43"
                  style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box'}}
                />
                {coteActuelle && (
                  <p style={{fontSize:'12px',color:VIOLET,margin:'4px 0 0',fontWeight:700}}>
                    = {coteToPct(parseFloat(coteActuelle))} chans
                  </p>
                )}
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#6b7280',display:'block',marginBottom:'4px'}}>Konfyans (1-5)</label>
                <div style={{display:'flex',gap:'4px',marginTop:'8px'}}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setConfianceActuelle(n)}
                      style={{flex:1,padding:'8px 0',borderRadius:'6px',border:'none',background:n<=confianceActuelle?'#f59e0b':'#e5e7eb',color:n<=confianceActuelle?'#fff':'#9ca3af',cursor:'pointer',fontSize:'16px'}}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={ajouterPari} style={{width:'100%',padding:'12px',background:'#111',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>
              ➕ Ajoute pari sa a
            </button>
          </div>
          {paris.length > 0 && (
            <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
              <h3 style={{fontWeight:700,marginBottom:'12px',fontSize:'16px'}}>📋 {paris.length} pari ajoute</h3>
              {paris.map((p, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f3f4f6',gap:'8px'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:'11px',color:'#9ca3af',marginRight:'6px',textTransform:'uppercase'}}>{p.niveau}</span>
                    <span style={{fontWeight:600,fontSize:'14px'}}>{p.valeur}</span>
                  </div>
                  <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                    {p.cote && (
                      <span style={{background:'#faf5ff',color:VIOLET,fontWeight:700,fontSize:'13px',padding:'3px 10px',borderRadius:'999px'}}>
                        {coteToPct(p.cote)}
                      </span>
                    )}
                    <span style={{color:'#f59e0b',fontSize:'12px'}}>{'★'.repeat(p.confiance || 0)}</span>
                    <button onClick={() => supprimerPari(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'18px',padding:'0 4px'}}>×</button></div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:'12px'}}>
            <button onClick={() => sauvegarder(false)} disabled={saving}
              style={{flex:1,padding:'14px',background:'#6b7280',color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>
              💾 Bouyon
            </button>
            <button onClick={() => sauvegarder(true)} disabled={saving}
              style={{flex:1,padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>
              {saving ? '...' : '🚀 Pibliye'}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}