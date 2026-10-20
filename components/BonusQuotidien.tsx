'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { montant, MONNAIE } from '../lib/fantasy';
import { BONUS_JOUR, BONUS_JOUR_7, JOURS_SERIE, RECOMPENSES } from '../lib/bonusQuotidien';

type Vue = { serie: number; dejaReclame: boolean; prochainJour: number; recompense: number; bonus: number; plafond: number };

// Carte « Bonus de connexion » : 7 jours, +100 $ par jour, +500 $ le 7e jour. onChange recharge le budget de la page.
export default function BonusQuotidien({ onChange }: { onChange?: () => void }) {
  const [v, setV] = useState<Vue | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const charger = async () => {
    const t = await jeton();
    if (!t) return;
    const r = await fetch('/api/fantasy-bonus', { headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json();
    if (r.ok && d.inscrit) setV(d);
  };
  useEffect(() => { charger(); }, []);

  const reclamer = async () => {
    const t = await jeton();
    if (!t) return;
    setEnvoi(true); setMsg(null);
    const r = await fetch('/api/fantasy-bonus', { method: 'POST', headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json();
    setEnvoi(false);
    if (!r.ok) { setMsg({ t: d.error || 'Erreur.', ok: false }); await charger(); return; }
    setMsg({ t: d.gain > 0 ? '🎁 +' + montant(d.gain) + ' ajoutés à ton budget !' : 'Plafond du bonus atteint (' + montant(d.plafond) + ').', ok: true });
    setV(d);
    onChange?.();
  };

  if (!v) return null;
  const aVenir = v.dejaReclame ? v.serie : v.serie; // jours déjà validés dans la série en cours
  return (
    <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '2px solid #f59e0b', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: '15px', color: '#78350f' }}>🎁 Bonus de connexion</div>
          <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>À partir de {BONUS_JOUR} {MONNAIE} par jour, jusqu'à {BONUS_JOUR_7} {MONNAIE} le jour {JOURS_SERIE}. Bonus cumulé : {montant(v.bonus)} / {montant(v.plafond)}</div>
        </div>
        <button onClick={reclamer} disabled={envoi || v.dejaReclame} style={{ background: v.dejaReclame ? '#d1d5db' : '#f59e0b', color: v.dejaReclame ? '#6b7280' : '#451a03', border: 'none', borderRadius: '999px', padding: '10px 18px', fontWeight: 900, fontSize: '13px', cursor: v.dejaReclame ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
          {v.dejaReclame ? '✅ Récupéré, reviens demain' : 'Récupérer +' + montant(v.recompense)}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
        {Array.from({ length: JOURS_SERIE }, (_, i) => {
          const n = i + 1;
          const fait = n <= aVenir;
          const prochain = !v.dejaReclame && n === v.prochainJour;
          return (
            <div key={n} style={{ flex: 1, textAlign: 'center', borderRadius: '10px', padding: '6px 0', fontWeight: 900, fontSize: '11px', background: fait ? '#16a34a' : prochain ? '#fde047' : '#fff', color: fait ? '#fff' : '#78350f', border: '2px solid ' + (fait ? '#16a34a' : prochain ? '#f59e0b' : '#fde68a') }}>
              <div>J{n}</div>
              <div style={{ fontSize: '10px' }}>{fait ? '✓' : '+' + RECOMPENSES[i]}</div>
            </div>
          );
        })}
      </div>
      {msg && <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 800, color: msg.ok ? '#065f46' : '#b91c1c' }}>{msg.t}</div>}
    </div>
  );
}
