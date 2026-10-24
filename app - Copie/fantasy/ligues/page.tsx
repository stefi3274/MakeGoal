'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { MAX_LIGUES_PAR_JOUEUR, MAX_MEMBRES_LIGUE, normaliserCode } from '../../../lib/fantasyLigues';

const VIOLET = '#bf00ff';
const SOMBRE = '#3b0764';

type Ligue = { id: string; nom: string; code: string; createur: boolean; membres: number };
type Ligne = { rang: number; nom: string; points: number; moi: boolean; embleme?: string; couleur?: string };

export default function LiguesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [ligues, setLigues] = useState<Ligue[]>([]);
  const [chargement, setChargement] = useState(true);
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [ouverte, setOuverte] = useState<Ligue | null>(null);
  const mode = '7' as const;
  const [classement, setClassement] = useState<Ligne[] | null>(null);

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const appel = async (corps: Record<string, unknown>) => {
    const t = await jeton();
    const r = await fetch('/api/fantasy-ligues', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(corps) });
    return { ok: r.ok, d: await r.json() };
  };

  const charger = async () => {
    const t = await jeton();
    if (!t) { setChargement(false); return; }
    const r = await fetch('/api/fantasy-ligues', { headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json();
    if (r.ok) setLigues(d.ligues || []);
    setChargement(false);
  };
  useEffect(() => { if (!authLoading) charger(); }, [authLoading, user]);

  useEffect(() => {
    if (!ouverte) { setClassement(null); return; }
    (async () => {
      setClassement(null);
      const t = await jeton();
      const r = await fetch('/api/fantasy-ligues?ligue=' + ouverte.id + '&mode=' + mode, { headers: { Authorization: 'Bearer ' + t } });
      const d = await r.json();
      if (r.ok) setClassement(d.classement); else setMessage({ texte: d.error || 'Erreur.', ok: false });
    })();
  }, [ouverte, mode]);

  const creer = async () => {
    setEnvoi(true); setMessage(null);
    const { ok, d } = await appel({ action: 'creer', nom });
    setEnvoi(false);
    if (!ok) { setMessage({ texte: d.error || 'Erreur.', ok: false }); return; }
    setNom('');
    setMessage({ texte: 'Ligue créée ! Envoie le code ' + d.code + ' à tes amis.', ok: true });
    await charger();
  };
  const rejoindre = async () => {
    setEnvoi(true); setMessage(null);
    const { ok, d } = await appel({ action: 'rejoindre', code });
    setEnvoi(false);
    if (!ok) { setMessage({ texte: d.error || 'Erreur.', ok: false }); return; }
    setCode('');
    setMessage({ texte: d.dejaMembre ? 'Tu es déjà dans « ' + d.nom + ' ».' : 'Bienvenue dans « ' + d.nom + ' » !', ok: true });
    await charger();
  };
  const quitter = async (l: Ligue) => {
    if (!window.confirm('Quitter la ligue « ' + l.nom + ' » ?')) return;
    const { ok, d } = await appel({ action: 'quitter', ligueId: l.id });
    if (!ok) { setMessage({ texte: d.error || 'Erreur.', ok: false }); return; }
    if (ouverte?.id === l.id) setOuverte(null);
    await charger();
  };
  const texteInvitation = (l: Ligue) => 'Rejoins ma ligue « ' + l.nom + ' » sur MakeGoal Fantasy ! Code : ' + l.code + ' https://makegoal.vercel.app/fantasy/ligues';

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'sans-serif' }}>
      <Header />
      <div style={{ background: 'linear-gradient(135deg,' + SOMBRE + ',' + VIOLET + ')', padding: '38px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px' }}>👥</div>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '28px', margin: '6px 0 6px' }}>Ligues entre amis</h1>
        <p style={{ color: '#e9d5ff', fontSize: '14px', margin: 0, fontWeight: 600 }}>Crée ta ligue, envoie le code à tes amis, et comparez vos points</p>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 60px' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/fantasy')} style={lien}>← Mon équipe</button>
        </div>
        {message && <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '14px', fontWeight: 700, fontSize: '13px', background: message.ok ? '#f0fdf4' : '#fef2f2', color: message.ok ? '#065f46' : '#b91c1c' }}>{message.texte}</div>}

        {!authLoading && !user && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#374151' }}>Connecte-toi pour créer ou rejoindre une ligue.</p>
            <button onClick={() => router.push('/compte')} style={{ background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '14px 28px', fontWeight: 900, fontSize: '15px', cursor: 'pointer' }}>S'inscrire / Se connecter</button>
          </div>
        )}

        {user && chargement && <p style={{ textAlign: 'center', color: '#6b7280', fontWeight: 700 }}>Chargement…</p>}

        {user && !chargement && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '12px', marginBottom: '22px' }}>
              <div style={carte}>
                <div style={titreCarte}>Créer une ligue</div>
                <input value={nom} onChange={e => setNom(e.target.value)} maxLength={40} placeholder="Nom de la ligue" style={champ} />
                <button onClick={creer} disabled={envoi || nom.trim().length < 3} style={{ ...bouton, opacity: envoi || nom.trim().length < 3 ? 0.5 : 1 }}>Créer</button>
              </div>
              <div style={carte}>
                <div style={titreCarte}>Rejoindre avec un code</div>
                <input value={code} onChange={e => setCode(normaliserCode(e.target.value))} maxLength={6} placeholder="CODE" style={{ ...champ, letterSpacing: '4px', textAlign: 'center', fontWeight: 900 }} />
                <button onClick={rejoindre} disabled={envoi || code.length < 6} style={{ ...bouton, opacity: envoi || code.length < 6 ? 0.5 : 1 }}>Rejoindre</button>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '-10px 0 18px', textAlign: 'center' }}>Maximum {MAX_LIGUES_PAR_JOUEUR} ligues par joueur et {MAX_MEMBRES_LIGUE} joueurs par ligue.</p>

            <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 10px' }}>Mes ligues</h3>
            {ligues.length === 0 && <p style={{ color: '#6b7280', fontWeight: 700, fontSize: '13px' }}>Tu n'as pas encore de ligue. Crées-en une ou rejoins celle d'un ami.</p>}
            {ligues.map(l => (
              <div key={l.id} style={{ border: '2px solid ' + (ouverte?.id === l.id ? VIOLET : '#e5e7eb'), borderRadius: '14px', padding: '12px 14px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontWeight: 900, fontSize: '15px' }}>{l.nom}{l.createur && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#f3e8ff', color: SOMBRE, borderRadius: '999px', padding: '1px 7px' }}>CRÉATEUR</span>}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{l.membres} joueur{l.membres > 1 ? 's' : ''} · code <b style={{ letterSpacing: '2px', color: '#111' }}>{l.code}</b></div>
                  </div>
                  <button onClick={() => setOuverte(ouverte?.id === l.id ? null : l)} style={petit(VIOLET, '#fff')}>{ouverte?.id === l.id ? 'Fermer' : '🏆 Classement'}</button>
                  <a href={'https://wa.me/?text=' + encodeURIComponent(texteInvitation(l))} target="_blank" rel="noreferrer" style={{ ...petit('#25d366', '#fff'), textDecoration: 'none' }}>WhatsApp</a>
                  <button onClick={() => quitter(l)} style={petit('#fef2f2', '#dc2626')}>Quitter</button>
                </div>
                {ouverte?.id === l.id && (
                  <div style={{ marginTop: '12px' }}>
                    {!classement && <p style={{ color: '#6b7280', fontWeight: 700, fontSize: '13px' }}>Chargement…</p>}
                    {classement && classement.map(x => (
                      <div key={x.rang + x.nom} style={{ display: 'flex', gap: '10px', padding: '9px 12px', background: x.moi ? '#faf5ff' : x.rang <= 3 ? '#fffbeb' : '#f9fafb', border: x.moi ? '2px solid ' + VIOLET : '2px solid transparent', borderRadius: '10px', marginBottom: '4px', fontWeight: 800, fontSize: '13px' }}>
                        <span style={{ width: '28px' }}>{x.rang === 1 ? '🥇' : x.rang === 2 ? '🥈' : x.rang === 3 ? '🥉' : x.rang}</span><span style={{ flex: 1 }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: x.couleur || VIOLET, marginRight: '6px' }} />{x.embleme || '⚽'} {x.nom}{x.moi ? ' (toi)' : ''}</span><span style={{ color: VIOLET }}>{x.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

const lien = { background: '#f3e8ff', color: SOMBRE, border: 'none', borderRadius: '999px', padding: '9px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' } as const;
const carte = { background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '14px', padding: '14px' } as const;
const titreCarte = { fontWeight: 900, fontSize: '14px', marginBottom: '10px' } as const;
const champ = { width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '10px' } as const;
const bouton = { width: '100%', padding: '12px', background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 900, fontSize: '14px', cursor: 'pointer' } as const;
const petit = (fond: string, couleur: string) => ({ padding: '8px 12px', borderRadius: '999px', border: 'none', background: fond, color: couleur, fontWeight: 900, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' } as const);
