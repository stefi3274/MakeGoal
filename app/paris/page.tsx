'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getSport, Sport } from '../../lib/sport';
import { placerCombine, soldeParis, initialiserSoldeParis, palierPourCoteMin, descriptionPaliers, coteDoubleChance, PARIS_CONSTANTES, Pronostic } from '../../lib/paris';

const COULEUR = '#bf00ff';

type MatchParis = {
  id: string; equipe1: string; equipe2: string; competition: string | null; pays: string | null;
  date_match: string; cote_1: number | null; cote_x: number | null; cote_2: number | null;
  cote_plus2_5: number | null; cote_moins2_5: number | null;
};

type Combine = {
  id: string; mise: number; cote_totale: number; gain_potentiel: number;
  statut: string; mise_qualifiante: boolean; created_at: string;
};

const LABELS_PRONOSTIC: Record<Pronostic, string> = {
  '1': 'Équipe 1', 'X': 'Nul', '2': 'Équipe 2',
  '1X': '1X', 'X2': 'X2', '12': '12',
  'plus2.5': '+2.5 buts', 'moins2.5': '-2.5 buts'
};

export default function ParisPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sport, setSportLocal] = useState<Sport>('football');
  const [vue, setVue] = useState<'parier' | 'mesparis'>('parier');
  const [matchs, setMatchs] = useState<MatchParis[]>([]);
  const [selections, setSelections] = useState<Record<string, Pronostic>>({});
  const [mise, setMise] = useState('');
  const [message, setMessage] = useState('');
  const [erreurPari, setErreurPari] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [solde, setSolde] = useState<{ solde: number; mise_cumulee_valide: number; retire: boolean } | null>(null);
  const [combines, setCombines] = useState<Combine[]>([]);
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setSportLocal(getSport()); }, []);
  useEffect(() => { charger(); }, [sport, user]);

  const charger = async () => {
    setLoading(true);
    const { data: m } = await supabase
      .from('matchs')
      .select('id, equipe1, equipe2, competition, pays, date_match, cote_1, cote_x, cote_2, cote_plus2_5, cote_moins2_5')
      .eq('sport', sport)
      .is('resultat_reel', null)
      .not('cote_1', 'is', null)
      .order('date_match', { ascending: true });
    if (m) setMatchs(m);

    if (user) {
      let s = await soldeParis(user.id);
      if (!s) {
        // Compte créé avant l'existence du système de paris : on l'initialise maintenant
        await initialiserSoldeParis(user.id);
        s = await soldeParis(user.id);
      }
      setSolde(s);
      const { data: c } = await supabase
        .from('paris_combines').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (c) setCombines(c);
    }
    setLoading(false);
  };

  const choisir = (matchId: string, choix: Pronostic) => {
    setSelections(prev => {
      const copie = { ...prev };
      if (copie[matchId] === choix) delete copie[matchId];
      else copie[matchId] = choix;
      return copie;
    });
  };

  const coteMatch = (m: MatchParis, choix: Pronostic): number | null => {
    switch (choix) {
      case '1': return m.cote_1;
      case 'X': return m.cote_x;
      case '2': return m.cote_2;
      case '1X': return (m.cote_1 && m.cote_x) ? coteDoubleChance(m.cote_1, m.cote_x) : null;
      case 'X2': return (m.cote_x && m.cote_2) ? coteDoubleChance(m.cote_x, m.cote_2) : null;
      case '12': return (m.cote_1 && m.cote_2) ? coteDoubleChance(m.cote_1, m.cote_2) : null;
      case 'plus2.5': return m.cote_plus2_5;
      case 'moins2.5': return m.cote_moins2_5;
      default: return null;
    }
  };

  const selectionsActives = Object.entries(selections).map(([matchId, pronostic]) => {
    const m = matchs.find(x => x.id === matchId);
    return { matchId, pronostic, cote: m ? (coteMatch(m, pronostic) || 0) : 0, match: m };
  }).filter(s => s.cote > 0);

  const coteTotale = selectionsActives.reduce((acc, s) => acc * s.cote, 1);
  const miseNum = parseFloat(mise) || 0;
  const gainPotentiel = Math.round(miseNum * coteTotale * 100) / 100;
  const coteMinDuCombine = selectionsActives.length > 0 ? Math.min(...selectionsActives.map(s => s.cote)) : 0;
  const palierActuel = palierPourCoteMin(coteMinDuCombine);
  const toutesQualifiantes = selectionsActives.length > 0 && !!palierActuel && coteTotale >= palierActuel.coteTotaleExigee;

  const validerCombine = async () => {
    if (!user) { router.push('/compte'); return; }
    setErreurPari('');
    if (selectionsActives.length < PARIS_CONSTANTES.SELECTIONS_MIN) {
      setErreurPari('❌ Un combiné doit contenir au moins ' + PARIS_CONSTANTES.SELECTIONS_MIN + ' sélections.');
      return;
    }
    if (miseNum < PARIS_CONSTANTES.MISE_MIN) {
      setErreurPari('❌ La mise minimum est de ' + PARIS_CONSTANTES.MISE_MIN + ' Gourdes.');
      return;
    }
    setEnvoiEnCours(true);
    const resultat = await placerCombine(user.id, miseNum, selectionsActives.map(s => ({ matchId: s.matchId, pronostic: s.pronostic, cote: s.cote })));
    setEnvoiEnCours(false);
    if (!resultat.ok) { setErreurPari('❌ ' + resultat.erreur); return; }
    setMessage('✅ Combiné validé ! Cote totale ' + resultat.coteTotale?.toFixed(2) + ', gain potentiel ' + resultat.gainPotentiel + ' Gourdes.' + (!resultat.miseQualifiante ? ' ⚠️ Cette mise ne compte pas dans votre objectif de retrait (cote totale insuffisante pour le palier atteignable avec vos cotes).' : ''));
    setSelections({}); setMise(''); setErreurPari('');
    charger();
  };

  const demanderRetrait = async () => {
    if (!user) return;
    setRetraitEnCours(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setRetraitEnCours(false); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/paris-retrait-demander', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    setRetraitEnCours(false);
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setMessage('✅ Retrait de ' + data.montant + ' Gourdes demandé. En attente de traitement.');
    charger();
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Port-au-Prince' });
  const progression = solde ? Math.min(100, Math.round((solde.mise_cumulee_valide / PARIS_CONSTANTES.OBJECTIF_MISE_CUMULEE) * 100)) : 0;
  const objectifAtteint = solde ? solde.mise_cumulee_valide >= PARIS_CONSTANTES.OBJECTIF_MISE_CUMULEE : false;

  const LIBELLES_STATUT: Record<string, { texte: string; couleur: string }> = {
    en_attente: { texte: '⏳ En attente', couleur: '#f59e0b' },
    gagne: { texte: '✅ Gagné', couleur: '#16a34a' },
    rembourse: { texte: '↩️ Remboursé', couleur: '#eab308' },
    perdu: { texte: '❌ Perdu', couleur: '#dc2626' }
  };

  const BoutonPronostic = ({ m, choix }: { m: MatchParis; choix: Pronostic }) => {
    const cote = coteMatch(m, choix);
    if (!cote) return null;
    const actif = selections[m.id] === choix;
    return (
      <button onClick={() => choisir(m.id, choix)} style={{
        flex: 1, padding: '8px 4px', borderRadius: '10px', cursor: 'pointer',
        border: actif ? '2px solid ' + COULEUR : '2px solid #e5e7eb',
        background: actif ? '#faf5ff' : '#fff', fontWeight: 700, minWidth: '52px'
      }}>
        <div style={{ fontSize: '10px', color: '#6b7280' }}>{LABELS_PRONOSTIC[choix]}</div>
        <div style={{ fontSize: '14px', color: actif ? COULEUR : '#111', fontWeight: 900 }}>{cote.toFixed(2)}</div>
      </button>
    );
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{display:'flex',gap:'8px',maxWidth:'700px',margin:'16px auto 0',padding:'0 16px'}}>
        <a href="/mes-points" style={{flex:1,textAlign:'center',padding:'10px',borderRadius:'999px',fontWeight:700,fontSize:'13px',textDecoration:'none',background:'#f3f4f6',color:'#6b7280'}}>🎯 Points</a>
        <a href="/paris" style={{flex:1,textAlign:'center',padding:'10px',borderRadius:'999px',fontWeight:700,fontSize:'13px',textDecoration:'none',background:COULEUR,color:'#fff'}}>🎲 Paris</a>
      </div>

      <div style={{background:'linear-gradient(135deg,#1a0033,'+COULEUR+')',padding:'36px 24px',textAlign:'center'}}>
        <p style={{color:'rgba(255,255,255,0.75)',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 8px'}}>🎲 Paris MakeGoal</p>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'26px',margin:'0 0 8px'}}>Paris combinés</h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'13px',margin:0}}>1 000 Gourdes offertes · Cotes ≥2.00 → total ≥20 · ≥1.50 → total ≥50 · ≥1.20 → total ≥70 · 1 seule perte = remboursé</p>
        <p style={{color:'#fde68a',fontSize:'12px',fontWeight:700,margin:'10px 0 0'}}>🔞 Réservé aux personnes de 18 ans ou plus</p>
      </div>

      <main style={{maxWidth:'700px',margin:'0 auto',padding:'24px 16px'}}>

        <div style={{display:'flex',gap:'8px',marginBottom:'20px',background:'#f3f4f6',borderRadius:'12px',padding:'4px'}}>
          <button onClick={() => setVue('parier')} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue==='parier'?'#fff':'transparent',color:vue==='parier'?COULEUR:'#6b7280'}}>Parier</button>
          <button onClick={() => setVue('mesparis')} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue==='mesparis'?'#fff':'transparent',color:vue==='mesparis'?COULEUR:'#6b7280'}}>Mes paris</button>
        </div>

        {message && <div style={{padding:'12px 16px',borderRadius:'12px',marginBottom:'16px',fontWeight:600,fontSize:'13px',background:message.includes('❌')?'#fef2f2':'#f0fdf4',color:message.includes('❌')?'#ef4444':'#10b981'}}>{message}</div>}

        {vue === 'parier' && (
          <>
            {loading && <p style={{color:'#9ca3af',textAlign:'center'}}>Chargement…</p>}
            {!loading && matchs.length === 0 && <p style={{color:'#9ca3af',textAlign:'center'}}>Aucun match avec cotes disponible pour le moment.</p>}

            {matchs.map(m => (
              <div key={m.id} style={{border:'2px solid '+(selections[m.id]?COULEUR:'#e5e7eb'),borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
                {(m.pays || m.competition) && <p style={{fontSize:'10px',color:'#9ca3af',fontWeight:700,textTransform:'uppercase',margin:'0 0 4px'}}>{m.pays ? m.pays + ' · ' : ''}{m.competition}</p>}
                <p style={{fontWeight:900,fontSize:'14px',margin:'0 0 2px'}}>{m.equipe1} vs {m.equipe2}</p>
                <p style={{fontSize:'11px',color:'#9ca3af',margin:'0 0 10px'}}>{formatDate(m.date_match)}</p>

                <p style={{fontSize:'10px',color:'#9ca3af',fontWeight:700,margin:'0 0 4px'}}>Résultat</p>
                <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
                  <BoutonPronostic m={m} choix="1" />
                  <BoutonPronostic m={m} choix="X" />
                  <BoutonPronostic m={m} choix="2" />
                </div>

                <p style={{fontSize:'10px',color:'#9ca3af',fontWeight:700,margin:'0 0 4px'}}>Double Chance</p>
                <div style={{display:'flex',gap:'6px',marginBottom: (m.cote_plus2_5 || m.cote_moins2_5) ? '8px' : 0}}>
                  <BoutonPronostic m={m} choix="1X" />
                  <BoutonPronostic m={m} choix="X2" />
                  <BoutonPronostic m={m} choix="12" />
                </div>

                {(m.cote_plus2_5 || m.cote_moins2_5) && (
                  <>
                    <p style={{fontSize:'10px',color:'#9ca3af',fontWeight:700,margin:'0 0 4px'}}>Buts (total du match)</p>
                    <div style={{display:'flex',gap:'6px'}}>
                      <BoutonPronostic m={m} choix="plus2.5" />
                      <BoutonPronostic m={m} choix="moins2.5" />
                    </div>
                  </>
                )}
              </div>
            ))}

            {selectionsActives.length > 0 && (
              <div style={{position:'sticky',bottom:'12px',background:'#fff',border:'2px solid '+COULEUR,borderRadius:'16px',padding:'16px',boxShadow:'0 -8px 24px rgba(0,0,0,0.08)',marginTop:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                  <span style={{fontWeight:700,fontSize:'13px'}}>{selectionsActives.length} sélection(s)</span>
                  <span style={{fontWeight:900,color:COULEUR}}>Cote totale : {coteTotale.toFixed(2)}</span>
                </div>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px'}}>{descriptionPaliers()}</p>
                {selectionsActives.length > 0 && !toutesQualifiantes && <p style={{fontSize:'11px',color:'#f59e0b',margin:'0 0 8px'}}>⚠️ {palierActuel ? ('Cote totale insuffisante pour ce palier (il faut ≥ ' + palierActuel.coteTotaleExigee + ')') : 'Une sélection a une cote sous 1.20'} — cette mise ne comptera pas dans l\'objectif de retrait.</p>}
                <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                  <input type="number" min={PARIS_CONSTANTES.MISE_MIN} value={mise} onChange={e => setMise(e.target.value)} placeholder={'Mise (min ' + PARIS_CONSTANTES.MISE_MIN + ' G)'} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #e5e7eb',fontSize:'14px'}}/>
                  <div style={{padding:'12px 14px',background:'#faf5ff',borderRadius:'10px',fontWeight:900,color:COULEUR,fontSize:'14px',whiteSpace:'nowrap'}}>≈ {gainPotentiel || 0} G</div>
                </div>
                {erreurPari && <div style={{padding:'10px 12px',borderRadius:'10px',marginBottom:'10px',fontWeight:600,fontSize:'12px',background:'#fef2f2',color:'#ef4444'}}>{erreurPari}</div>}
                <button onClick={validerCombine} disabled={envoiEnCours} style={{width:'100%',padding:'14px',background:COULEUR,color:'#fff',border:'none',borderRadius:'12px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{envoiEnCours ? '...' : '🎲 Parier'}</button>
              </div>
            )}
          </>
        )}

        {vue === 'mesparis' && (
          <>
            {!user ? (
              <p style={{textAlign:'center',color:'#6b7280'}}>Connectez-vous pour voir vos paris.</p>
            ) : (
              <>
                <div style={{background:'linear-gradient(135deg,#1a0033,'+COULEUR+')',borderRadius:'20px',padding:'24px',textAlign:'center',marginBottom:'20px'}}>
                  <p style={{color:'rgba(255,255,255,0.75)',fontSize:'12px',fontWeight:700,textTransform:'uppercase',margin:'0 0 6px'}}>Solde</p>
                  <h2 style={{color:'#fff',fontWeight:900,fontSize:'36px',margin:'0 0 16px'}}>{solde?.solde.toLocaleString('fr-FR') ?? '—'} G</h2>
                  <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'10px',height:'8px',overflow:'hidden',marginBottom:'6px'}}>
                    <div style={{background:'#ffd700',height:'100%',width:progression+'%'}}/>
                  </div>
                  <p style={{color:'rgba(255,255,255,0.85)',fontSize:'12px',margin:0}}>{Math.round(solde?.mise_cumulee_valide||0).toLocaleString('fr-FR')} / {PARIS_CONSTANTES.OBJECTIF_MISE_CUMULEE.toLocaleString('fr-FR')} G misées (qualifiantes)</p>
                </div>

                {objectifAtteint && !solde?.retire && (
                  <button onClick={demanderRetrait} disabled={retraitEnCours} style={{width:'100%',padding:'16px',background:'#16a34a',color:'#fff',border:'none',borderRadius:'14px',fontWeight:700,fontSize:'15px',cursor:'pointer',marginBottom:'20px'}}>{retraitEnCours ? '...' : '💰 Retirer 1 000 Gourdes'}</button>
                )}
                {solde?.retire && <p style={{textAlign:'center',color:'#16a34a',fontWeight:700,fontSize:'13px',marginBottom:'20px'}}>✅ Retrait déjà effectué sur ce compte.</p>}

                <h3 style={{fontWeight:900,fontSize:'16px',marginBottom:'10px'}}>Historique</h3>
                {combines.length === 0 && <p style={{color:'#9ca3af',fontSize:'13px'}}>Aucun combiné pour le moment.</p>}
                {combines.map(c => {
                  const s = LIBELLES_STATUT[c.statut] || LIBELLES_STATUT.en_attente;
                  return (
                    <div key={c.id} style={{border:'1px solid #e5e7eb',borderRadius:'12px',padding:'12px 14px',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <p style={{fontWeight:700,fontSize:'13px',margin:'0 0 2px',color:s.couleur}}>{s.texte}</p>
                        <p style={{fontSize:'11px',color:'#9ca3af',margin:0}}>Mise {c.mise} G · Cote {c.cote_totale.toFixed(2)} · {formatDate(c.created_at)}</p>
                      </div>
                      <span style={{fontWeight:900,fontSize:'14px',color:s.couleur}}>{c.statut==='gagne' ? '+' + c.gain_potentiel : c.statut==='perdu' ? '-' + c.mise : c.mise} G</span>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        <p style={{textAlign:'center',marginTop:'24px'}}>
          <a href="/paris/termes" style={{color:COULEUR,fontSize:'14px',fontWeight:600}}>📜 Termes et conditions des paris</a>
        </p>

      </main>
      <Footer />
    </div>
  );
}
