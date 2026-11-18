'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminAuth from '../../components/AdminAuth';
import { MISE_MIN, MISE_MAX, GAIN_MAX, SELECTIONS_MAX, MARCHES, calculerTicket, numeroAffiche, type Marche } from '../../lib/caisse';

type OffreC = { id: string; match_id: string; marche: Marche; choix: string; libelle: string; cote: number };
type MatchC = { id: string; equipe1: string; equipe2: string; competition: string | null; date_match: string; offres: OffreC[] };
type LigneV = { id: string; match_libelle: string; date_match: string; libelle: string; cote: number; resultat: string | null };
type TicketV = { id: string; numero: number; mise: number; cote_totale: number; gain_potentiel: number; statut: string; gain_final: number | null; created_at: string };

const VIOLET = '#bf00ff';
const MARCHES_ORDRE: Marche[] = ['1x2', 'dc', 'mt_1x2', 'mt_dc', 'une_mt', 'ou', 'combo', 'buteur', 'premier_buteur', 'qualif'];
const heureHaiti = (iso: string) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const bouton = (bg: string, plein = false) => ({ padding: '12px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px', background: bg, color: '#fff', width: plein ? '100%' : undefined });
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #333', background: '#222', color: '#fff', fontSize: '16px', boxSizing: 'border-box' as const };

export default function Caisse() {
  const [connecte, setConnecte] = useState(false);
  const [onglet, setOnglet] = useState<'ticket' | 'verifier'>('ticket');
  const [matchs, setMatchs] = useState<MatchC[]>([]);
  const [panier, setPanier] = useState<OffreC[]>([]);
  const [mise, setMise] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const [numero, setNumero] = useState('');
  const [code, setCode] = useState('');
  const [trouve, setTrouve] = useState<{ ticket: TicketV; lignes: LigneV[] } | null>(null);

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token || '';
  const appel = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await jeton()) } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur ' + res.status);
    return json;
  };

  const charger = async () => {
    try { const j = await appel('/api/caisse-offres'); setMatchs(j.matchs); const toutes: OffreC[] = (j.matchs as MatchC[]).flatMap(m => m.offres); setPanier(p => p.flatMap(o => { const n = toutes.find(x => x.id === o.id); return n ? [n] : []; })); } catch (e) { setMessage('❌ ' + (e as Error).message); }
  };
  useEffect(() => { if (connecte) charger(); }, [connecte]);

  const basculer = (o: OffreC) => setPanier(p => {
    if (p.some(x => x.id === o.id)) return p.filter(x => x.id !== o.id);
    const sansMatch = p.filter(x => x.match_id !== o.match_id); // une seule sélection par match
    if (sansMatch.length >= SELECTIONS_MAX) { setMessage('❌ Maximum ' + SELECTIONS_MAX + ' sélections.'); return sansMatch; }
    setMessage('');
    return [...sansMatch, o];
  });

  const miseNum = parseFloat(mise.replace(',', '.'));
  const calc = useMemo(() => calculerTicket(Number.isFinite(miseNum) ? miseNum : 0, panier.map(o => Number(o.cote))), [miseNum, panier]);
  const miseOk = Number.isFinite(miseNum) && miseNum >= MISE_MIN && miseNum <= MISE_MAX && panier.length >= 1 && calc.gain <= GAIN_MAX;

  const imprimer = async () => {
    if (!miseOk || occupe) return;
    setOccupe(true); setMessage('');
    try {
      const j = await appel('/api/caisse-ticket', { method: 'POST', body: JSON.stringify({ mise: miseNum, offreIds: panier.map(o => o.id), cotes: Object.fromEntries(panier.map(o => [o.id, Number(o.cote)])) }) });
      window.location.href = '/caisse/ticket/' + j.id + '?auto=1';
    } catch (e) { setMessage('❌ ' + (e as Error).message); setOccupe(false); await charger(); }
  };

  const verifier = async () => {
    setTrouve(null); setMessage('');
    try { setTrouve(await appel('/api/caisse-ticket?numero=' + encodeURIComponent(numero) + '&code=' + encodeURIComponent(code))); } catch (e) { setMessage('❌ ' + (e as Error).message); }
  };
  const payer = async () => {
    if (!trouve || !confirm('Payer ' + fmt(Number(trouve.ticket.gain_final)) + ' Gourdes pour le ticket ' + numeroAffiche(trouve.ticket.numero) + ' ?')) return;
    setOccupe(true);
    try { await appel('/api/caisse-payer', { method: 'POST', body: JSON.stringify({ id: trouve.ticket.id }) }); setMessage('✅ Ticket payé.'); await verifier(); } catch (e) { setMessage('❌ ' + (e as Error).message); }
    setOccupe(false);
  };

  if (!connecte) return <AdminAuth titre="Caisse paris" onAuthentifie={() => setConnecte(true)} />;

  const statutInfo = (t: TicketV) => t.statut === 'gagnant' ? { txt: 'GAGNANT : À PAYER ' + fmt(Number(t.gain_final)) + ' G', c: '#16a34a' }
    : t.statut === 'paye' ? { txt: 'DÉJÀ PAYÉ (' + fmt(Number(t.gain_final)) + ' G)', c: '#2563eb' }
    : t.statut === 'perdant' ? { txt: 'PERDANT : NE PAS PAYER', c: '#dc2626' }
    : t.statut === 'annule' ? { txt: 'ANNULÉ : NE PAS PAYER', c: '#6b7280' }
    : { txt: 'EN ATTENTE : ne pas payer pour l\'instant', c: '#ca8a04' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#111', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: VIOLET, fontWeight: 900, fontSize: '18px', margin: 0 }}>🧾 Caisse paris</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setOnglet('ticket')} style={{ ...bouton(onglet === 'ticket' ? VIOLET : '#333'), padding: '10px 16px' }}>Nouveau ticket</button>
          <button onClick={() => setOnglet('verifier')} style={{ ...bouton(onglet === 'verifier' ? VIOLET : '#333'), padding: '10px 16px' }}>Vérifier / Payer</button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
        {message && <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '14px' }}>{message}</div>}

        {onglet === 'ticket' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <section style={{ flex: '2 1 480px', minWidth: 0 }}>
              {!matchs.length && <p style={{ color: '#9ca3af' }}>Aucun match ouvert aux paris pour le moment.</p>}
              {matchs.map(m => {
                const ouv = ouvert === m.id || matchs.length === 1;
                const choisie = panier.find(x => x.match_id === m.id);
                return (
                  <div key={m.id} style={{ background: '#1a1a1a', border: '1px solid ' + (choisie ? VIOLET : '#2a2a2a'), borderRadius: '14px', marginBottom: '10px', overflow: 'hidden' }}>
                    <button onClick={() => setOuvert(ouv ? null : m.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#fff', padding: '14px', cursor: 'pointer' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{heureHaiti(m.date_match)}{m.competition ? ' · ' + m.competition : ''}</div>
                      <div style={{ fontWeight: 900, fontSize: '16px' }}>{m.equipe1} <span style={{ color: '#9ca3af' }}>-</span> {m.equipe2}</div>
                      {choisie && <div style={{ fontSize: '12px', color: '#d8b4fe', marginTop: '4px' }}>✔ {choisie.libelle} @ {choisie.cote.toFixed(2)}</div>}
                    </button>
                    {ouv && (
                      <div style={{ padding: '0 14px 14px' }}>
                        {MARCHES_ORDRE.map(mk => {
                          const liste = m.offres.filter(o => o.marche === mk);
                          if (!liste.length) return null;
                          return (
                            <div key={mk} style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: '#a78bfa', margin: '4px 0' }}>{MARCHES[mk].label}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {liste.map(o => {
                                  const on = panier.some(x => x.id === o.id);
                                  return (
                                    <button key={o.id} onClick={() => basculer(o)} style={{ flex: '1 1 150px', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: '1px solid ' + (on ? VIOLET : '#333'), background: on ? VIOLET : '#222', color: '#fff', cursor: 'pointer' }}>
                                      <div style={{ fontSize: '12px', lineHeight: 1.25 }}>{o.libelle}</div>
                                      <div style={{ fontWeight: 900, fontSize: '17px' }}>{Number(o.cote).toFixed(2)}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <aside style={{ flex: '1 1 300px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '16px', position: 'sticky', top: '12px' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 900 }}>Ticket ({panier.length})</p>
              {!panier.length && <p style={{ color: '#6b7280', fontSize: '13px' }}>Touchez une cote pour l'ajouter.</p>}
              {panier.map(o => {
                const m = matchs.find(x => x.id === o.match_id);
                return (
                  <div key={o.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', borderBottom: '1px solid #2a2a2a', padding: '8px 0' }}>
                    <div style={{ flex: 1, fontSize: '12px' }}><div style={{ color: '#9ca3af' }}>{m ? m.equipe1 + ' - ' + m.equipe2 : ''}</div><div style={{ fontWeight: 700 }}>{o.libelle}</div></div>
                    <b>{Number(o.cote).toFixed(2)}</b>
                    <button onClick={() => basculer(o)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {[50, 100, 250, 500, 1000].map(v => <button key={v} onClick={() => setMise(String(v))} style={{ ...bouton('#2a2a2a'), padding: '8px 12px', fontSize: '13px' }}>{v}</button>)}
              </div>
              <input value={mise} onChange={e => setMise(e.target.value)} inputMode="decimal" placeholder={'Mise en Gourdes (min ' + MISE_MIN + ')'} style={{ ...inputStyle, width: '100%', marginTop: '10px' }} />
              <div style={{ margin: '12px 0', fontSize: '14px', lineHeight: 1.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cote totale</span><b>{panier.length ? calc.coteTotale.toFixed(2) : '-'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}><span>Gain possible</span><b style={{ color: '#4ade80' }}>{panier.length && Number.isFinite(miseNum) ? fmt(calc.gain) + ' G' : '-'}</b></div>
                {calc.gain > GAIN_MAX && <div style={{ color: '#f87171', fontSize: '12px' }}>Gain maximum {fmt(GAIN_MAX)} G dépassé.</div>}
                {Number.isFinite(miseNum) && mise !== '' && (miseNum < MISE_MIN || miseNum > MISE_MAX) && <div style={{ color: '#f87171', fontSize: '12px' }}>Mise entre {MISE_MIN} et {fmt(MISE_MAX)} G.</div>}
              </div>
              <button disabled={!miseOk || occupe} onClick={imprimer} style={{ ...bouton(miseOk ? VIOLET : '#444', true), opacity: miseOk && !occupe ? 1 : 0.6 }}>{occupe ? '⏳ Création...' : '🖨️ Valider et imprimer'}</button>
              {!!panier.length && <button onClick={() => setPanier([])} style={{ ...bouton('transparent', true), color: '#9ca3af', marginTop: '6px' }}>Vider</button>}
            </aside>
          </div>
        )}

        {onglet === 'verifier' && (
          <section style={{ maxWidth: '520px', margin: '0 auto' }}>
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>Saisissez le numéro et le code à 6 caractères inscrits sur le ticket du client.</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="N° (T000123)" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="CODE" style={{ ...inputStyle, width: '120px', letterSpacing: '3px', textTransform: 'uppercase' }} />
            </div>
            <button onClick={verifier} style={bouton(VIOLET, true)}>Vérifier</button>
            {trouve && (() => {
              const s = statutInfo(trouve.ticket);
              return (
                <div style={{ marginTop: '16px', background: '#1a1a1a', borderRadius: '14px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                  <div style={{ background: s.c, padding: '16px', fontWeight: 900, fontSize: '18px', textAlign: 'center' }}>{s.txt}</div>
                  <div style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ marginBottom: '8px' }}><b>{numeroAffiche(trouve.ticket.numero)}</b> · {heureHaiti(trouve.ticket.created_at)} · Mise {fmt(Number(trouve.ticket.mise))} G · Cote {Number(trouve.ticket.cote_totale).toFixed(2)}</div>
                    {trouve.lignes.map(l => (
                      <div key={l.id} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderTop: '1px solid #2a2a2a' }}>
                        <span style={{ width: '22px' }}>{l.resultat === 'gagne' ? '✅' : l.resultat === 'perdu' ? '❌' : l.resultat === 'annule' ? '↺' : '⏳'}</span>
                        <span style={{ flex: 1 }}><span style={{ color: '#9ca3af' }}>{l.match_libelle}</span><br />{l.libelle}</span><b>{Number(l.cote).toFixed(2)}</b>
                      </div>
                    ))}
                    {trouve.ticket.statut === 'gagnant' && <button disabled={occupe} onClick={payer} style={{ ...bouton('#16a34a', true), marginTop: '12px' }}>💵 Payer {fmt(Number(trouve.ticket.gain_final))} G</button>}
                    <a href={'/caisse/ticket/' + trouve.ticket.id} style={{ display: 'block', textAlign: 'center', marginTop: '10px', color: '#a78bfa', fontSize: '12px' }}>Réimprimer (duplicata)</a>
                  </div>
                </div>
              );
            })()}
          </section>
        )}
      </main>
    </div>
  );
}
