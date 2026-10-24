'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { EMOJIS_CHAT, MAX_CARACTERES } from '../../lib/chat';
import { texteSur } from '../../lib/fantasyProfil';

const VIOLET = '#bf00ff';
const SOMBRE = '#3b0764';

type Reaction = { emoji: string; n: number; moi: boolean };
type Message = { id: string; contenu: string; cree_le: string; moi: boolean; auteur: string; embleme: string; couleur: string; reactions: Reaction[]; statut?: string; signalements?: number; user_id?: string };
type Ban = { jusqu_a: string; raison: string | null } | null;

const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function ChatPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [admin, setAdmin] = useState(false);
  const [ban, setBan] = useState<Ban>(null);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [charge, setCharge] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const fond = useRef<HTMLDivElement>(null);
  const proche = useRef(true);

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const charger = useCallback(async () => {
    const t = await jeton();
    if (!t) return;
    const r = await fetch('/api/chat', { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(d.error || 'Chargement impossible.'); setCharge(true); return; }
    setMessages(d.messages || []); setAdmin(!!d.admin); setBan(d.ban || null); setCharge(true);
  }, []);

  useEffect(() => { if (!authLoading && !user) router.push('/compte'); }, [authLoading, user, router]);
  useEffect(() => {
    if (authLoading || !user) return;
    charger();
    const id = setInterval(() => { if (document.visibilityState === 'visible') charger(); }, 5000);
    return () => clearInterval(id);
  }, [authLoading, user, charger]);
  useEffect(() => { if (proche.current && fond.current) fond.current.scrollTop = fond.current.scrollHeight; }, [messages]);

  const appel = async (corps: Record<string, unknown>) => {
    const t = await jeton();
    if (!t) return false;
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(corps) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(d.error || 'Erreur.'); if (d.ban) setBan(d.ban); return false; }
    setErreur('');
    return true;
  };

  const envoyer = async () => {
    const t = texte.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    const ok = await appel({ action: 'envoyer', contenu: t });
    setEnvoi(false);
    if (ok) { setTexte(''); proche.current = true; charger(); }
  };
  const agir = async (corps: Record<string, unknown>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setPicker(null);
    if (await appel(corps)) charger();
  };

  return (
    <main style={{ minHeight: '100vh', background: '#faf5ff', fontFamily: 'sans-serif' }}>
      <Header />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 12px 40px' }}>
        <div style={{ background: SOMBRE, color: '#fff', borderRadius: '16px 16px 0 0', padding: '14px 18px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>💬 Chat MakeGoal</h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>Respect obligatoire : pas d'insultes, pas de liens, pas de spam. Signale (🚩) tout abus.</p>
        </div>
        <div ref={fond} onScroll={e => { const el = e.currentTarget; proche.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} style={{ background: '#fff', border: '1px solid #e9d5ff', borderTop: 'none', height: '60vh', overflowY: 'auto', padding: '14px 12px' }}>
          {!charge && <p style={{ color: '#6b7280', textAlign: 'center' }}>Chargement…</p>}
          {charge && messages.length === 0 && !erreur && <p style={{ color: '#6b7280', textAlign: 'center' }}>Aucun message pour l'instant. Lance la discussion ! ⚽</p>}
          {messages.map(m => {
            const masque = m.statut === 'masque';
            return (
              <div key={m.id} style={{ display: 'flex', gap: '10px', marginBottom: '14px', opacity: masque ? 0.55 : 1 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: m.couleur, color: texteSur(m.couleur), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{m.embleme}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    <b style={{ color: m.moi ? VIOLET : '#111' }}>{m.auteur}{m.moi ? ' (toi)' : ''}</b> · {heure(m.cree_le)}
                    {masque && <span style={{ color: '#b91c1c', fontWeight: 800 }}> · masqué ({m.signalements} signalements)</span>}
                  </div>
                  <div style={{ background: m.moi ? '#f3e8ff' : '#f3f4f6', borderRadius: '4px 14px 14px 14px', padding: '8px 12px', marginTop: '3px', fontSize: '14px', color: '#111', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{m.contenu}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px', alignItems: 'center' }}>
                    {m.reactions.map(r => (
                      <button key={r.emoji} onClick={() => agir({ action: 'reagir', message_id: m.id, emoji: r.emoji })} style={{ border: '1px solid ' + (r.moi ? VIOLET : '#e5e7eb'), background: r.moi ? '#f3e8ff' : '#fff', borderRadius: '999px', padding: '2px 8px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>{r.emoji} {r.n}</button>
                    ))}
                    <button onClick={() => setPicker(picker === m.id ? null : m.id)} aria-label="Réagir" style={petit}>😊+</button>
                    {!m.moi && <button onClick={() => agir({ action: 'signaler', message_id: m.id }, 'Signaler ce message aux modérateurs ?')} aria-label="Signaler" style={petit}>🚩</button>}
                    {(m.moi || admin) && <button onClick={() => agir({ action: 'supprimer', message_id: m.id }, 'Supprimer ce message ?')} aria-label="Supprimer" style={petit}>🗑</button>}
                    {admin && masque && <button onClick={() => agir({ action: 'retablir', message_id: m.id })} style={{ ...petit, color: '#065f46' }}>Rétablir</button>}
                    {admin && !m.moi && m.user_id && <>
                      <button onClick={() => agir({ action: 'bannir', user_id: m.user_id, heures: 24, raison: 'Modération' }, 'Bannir ' + m.auteur + ' 24 h et retirer ses messages récents ?')} style={{ ...petit, color: '#b91c1c' }}>Ban 24h</button>
                      <button onClick={() => agir({ action: 'bannir', user_id: m.user_id, heures: 168, raison: 'Modération' }, 'Bannir ' + m.auteur + ' 7 jours et retirer ses messages récents ?')} style={{ ...petit, color: '#b91c1c' }}>Ban 7j</button>
                    </>}
                  </div>
                  {picker === m.id && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '4px', width: 'fit-content', flexWrap: 'wrap' }}>
                      {EMOJIS_CHAT.map(e => <button key={e} onClick={() => agir({ action: 'reagir', message_id: m.id, emoji: e })} style={{ border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', padding: '2px 5px' }}>{e}</button>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e9d5ff', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '12px' }}>
          {ban ? (
            <p style={{ margin: 0, color: '#b91c1c', fontWeight: 800, fontSize: '14px' }}>🚫 Tu es suspendu du chat jusqu'au {new Date(ban.jusqu_a).toLocaleString('fr-FR')}.</p>
          ) : (
            <>
              {erreur && <p style={{ margin: '0 0 8px', color: '#b91c1c', fontSize: '13px', fontWeight: 700 }}>⚠️ {erreur}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={texte} onChange={e => setTexte(e.target.value.slice(0, MAX_CARACTERES))} onKeyDown={e => { if (e.key === 'Enter') envoyer(); }} placeholder="Écris ton message…" maxLength={MAX_CARACTERES} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: '2px solid #e5e7eb', fontSize: '15px', minWidth: 0 }} />
                <button onClick={envoyer} disabled={envoi || !texte.trim()} style={{ background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '0 22px', fontWeight: 900, cursor: 'pointer', opacity: envoi || !texte.trim() ? 0.5 : 1 }}>Envoyer</button>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{texte.length}/{MAX_CARACTERES}</div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

const petit = { border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#6b7280', padding: '2px 4px', fontWeight: 700 } as const;
