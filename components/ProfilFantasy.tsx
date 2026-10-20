'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Maillot from './Maillot';
import { COULEUR1_DEFAUT, COULEUR2_DEFAUT, EMBLEME_DEFAUT, EMBLEMES, PALETTES, couleurValide, texteSur } from '../lib/fantasyProfil';

const VIOLET = '#bf00ff';

// Section « Mon équipe Fantasy » du profil : nom, emblème, couleurs du maillot.
export default function ProfilFantasy() {
  const [etat, setEtat] = useState<'chargement' | 'absent' | 'ok'>('chargement');
  const [nom, setNom] = useState('');
  const [c1, setC1] = useState(COULEUR1_DEFAUT);
  const [c2, setC2] = useState(COULEUR2_DEFAUT);
  const [emb, setEmb] = useState(EMBLEME_DEFAUT);
  const [initial, setInitial] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;

  useEffect(() => {
    (async () => {
      const t = await jeton();
      if (!t) { setEtat('absent'); return; }
      const r = await fetch('/api/fantasy-equipe', { headers: { Authorization: 'Bearer ' + t } });
      const d = await r.json();
      if (!r.ok || !d.equipe) { setEtat('absent'); return; }
      setNom(d.equipe.nom_equipe || '');
      setC1(couleurValide(d.equipe.couleur1) ? d.equipe.couleur1 : COULEUR1_DEFAUT);
      setC2(couleurValide(d.equipe.couleur2) ? d.equipe.couleur2 : COULEUR2_DEFAUT);
      setEmb(d.equipe.embleme || EMBLEME_DEFAUT);
      setInitial(JSON.stringify([d.equipe.nom_equipe, d.equipe.couleur1 || COULEUR1_DEFAUT, d.equipe.couleur2 || COULEUR2_DEFAUT, d.equipe.embleme || EMBLEME_DEFAUT]));
      setEtat('ok');
    })();
  }, []);

  const modifie = JSON.stringify([nom, c1, c2, emb]) !== initial;

  const sauver = async () => {
    const t = await jeton();
    if (!t) return;
    setEnvoi(true); setMsg(null);
    const r = await fetch('/api/fantasy-equipe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'profil', nom_equipe: nom, couleur1: c1, couleur2: c2, embleme: emb }) });
    const d = await r.json();
    setEnvoi(false);
    if (!r.ok) { setMsg({ t: '❌ ' + (d.error || 'Erreur.'), ok: false }); return; }
    setInitial(JSON.stringify([nom.trim(), c1, c2, emb]));
    setNom(nom.trim());
    setMsg({ t: '✅ Profil enregistré !', ok: true });
  };

  if (etat === 'chargement') return null;

  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '16px' }}>🏟️ Mon équipe Fantasy</h2>
      {etat === 'absent' ? (
        <div style={{ background: '#f9fafb', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', margin: '0 0 12px', fontSize: '14px' }}>Tu n'as pas encore d'équipe Fantasy. C'est gratuit !</p>
          <a href="/fantasy" style={{ background: VIOLET, color: '#fff', textDecoration: 'none', borderRadius: '999px', padding: '10px 22px', fontWeight: 800, fontSize: '14px' }}>Jouer à MakeGoal Fantasy</a>
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '18px', overflow: 'hidden' }}>
          <div style={{ background: c1, color: texteSur(c1), padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '6px solid ' + c2 }}>
            <div style={{ fontSize: '40px', lineHeight: 1 }}>{emb}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom || 'Mon équipe'}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {['G', 'D', 'M', 'A'].map(l => <Maillot key={l} c1={c1} c2={c2} lettre={l} taille={30} />)}
              </div>
            </div>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <label style={lab}>Nom de l'équipe</label>
            <input value={nom} onChange={e => setNom(e.target.value)} maxLength={30} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '15px', fontWeight: 700, boxSizing: 'border-box', marginBottom: '16px' }} />

            <label style={lab}>Emblème</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {EMBLEMES.map(e => (
                <button key={e} onClick={() => setEmb(e)} style={{ width: '42px', height: '42px', fontSize: '22px', borderRadius: '10px', cursor: 'pointer', background: emb === e ? '#f3e8ff' : '#fff', border: '2px solid ' + (emb === e ? VIOLET : '#e5e7eb') }}>{e}</button>
              ))}
            </div>

            <label style={lab}>Couleurs du maillot</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {PALETTES.map(p => (
                <button key={p.nom} onClick={() => { setC1(p.c1); setC2(p.c2); }} title={p.nom} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px 5px 5px', borderRadius: '999px', cursor: 'pointer', background: '#fff', border: '2px solid ' + (c1 === p.c1 && c2 === p.c2 ? VIOLET : '#e5e7eb'), fontSize: '12px', fontWeight: 700 }}>
                  <Maillot c1={p.c1} c2={p.c2} taille={22} />{p.nom}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>Couleur principale <input type="color" value={c1} onChange={e => setC1(e.target.value)} style={{ width: '44px', height: '34px', border: 'none', background: 'none', cursor: 'pointer' }} /></label>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>Couleur du contour <input type="color" value={c2} onChange={e => setC2(e.target.value)} style={{ width: '44px', height: '34px', border: 'none', background: 'none', cursor: 'pointer' }} /></label>
            </div>

            {msg && <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: msg.ok ? '#065f46' : '#b91c1c' }}>{msg.t}</p>}
            <button onClick={sauver} disabled={envoi || !modifie || nom.trim().length < 2} style={{ background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '12px 26px', fontWeight: 900, fontSize: '14px', cursor: 'pointer', opacity: envoi || !modifie || nom.trim().length < 2 ? 0.5 : 1 }}>Enregistrer mon profil</button>
          </div>
        </div>
      )}
    </section>
  );
}

const lab = { display: 'block', fontSize: '12px', fontWeight: 900, color: '#374151', textTransform: 'uppercase', marginBottom: '8px' } as const;
