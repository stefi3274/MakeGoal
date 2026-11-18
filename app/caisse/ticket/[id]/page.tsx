'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import AdminAuth from '../../../../components/AdminAuth';
import { numeroAffiche, VALIDITE_JOURS } from '../../../../lib/caisse';

type Ligne = { id: string; match_libelle: string; date_match: string; libelle: string; cote: number };
type Ticket = { id: string; numero: number; code: string; mise: number; cote_totale: number; gain_potentiel: number; created_at: string };

const quand = (iso: string) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmt = (n: number) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

// Ticket au format rouleau thermique 58 mm, SANS QR Code : numéro + code de contrôle à 6 caractères.
export default function TicketImprime() {
  const params = useParams();
  const id = String(params?.id || '');
  const [connecte, setConnecte] = useState(false);
  const [t, setT] = useState<{ ticket: Ticket; lignes: Ligne[] } | null>(null);
  const [erreur, setErreur] = useState('');
  const [duplicata, setDuplicata] = useState(true);

  useEffect(() => {
    if (!connecte) return;
    const auto = new URLSearchParams(window.location.search).get('auto') === '1';
    setDuplicata(!auto);
    (async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token || '';
      const res = await fetch('/api/caisse-ticket?id=' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + token } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(j.error || 'Erreur'); return; }
      setT(j);
      if (auto) setTimeout(() => window.print(), 400);
    })();
  }, [connecte, id]);

  if (!connecte) return <AdminAuth titre="Ticket" onAuthentifie={() => setConnecte(true)} />;

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', padding: '16px', fontFamily: 'sans-serif' }}>
      <style>{`
        @page { size: 58mm auto; margin: 0; }
        @media print { body { background: #fff !important; } .no-print { display: none !important; } .ticket { box-shadow: none !important; margin: 0 !important; } }
        .ticket { width: 52mm; margin: 0 auto; background: #fff; color: #000; padding: 2mm 1mm; font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.3; overflow-wrap: anywhere; box-shadow: 0 2px 12px rgba(0,0,0,.2); }
        .ticket hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .ticket .gros { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
        .ticket .ligne { display: flex; justify-content: space-between; gap: 4px; }
        .ticket .ligne b { white-space: nowrap; flex-shrink: 0; }
      `}</style>
      <div className="no-print" style={{ textAlign: 'center', marginBottom: '12px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => window.print()} style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: '#bf00ff', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>🖨️ Imprimer</button>
        <a href="/caisse" style={{ padding: '12px 20px', borderRadius: '10px', background: '#111', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>➕ Nouveau ticket</a>
      </div>
      {erreur && <p style={{ textAlign: 'center', color: '#b91c1c', fontWeight: 700 }}>{erreur}</p>}
      {t && (
        <div className="ticket">
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '14px' }}>MAKEGOAL PARIS</div>
          {duplicata && <div style={{ textAlign: 'center', fontWeight: 900, border: '2px solid #000', margin: '4px 0', padding: '2px' }}>*** DUPLICATA ***</div>}
          <hr />
          <div className="ligne"><span>Ticket</span><b className="gros">{numeroAffiche(t.ticket.numero)}</b></div>
          <div className="ligne"><span>Code</span><b className="gros">{t.ticket.code}</b></div>
          <div>{quand(t.ticket.created_at)} (Haïti)</div>
          <hr />
          {t.lignes.map(l => (
            <div key={l.id} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 700 }}>{l.match_libelle}</div>
              <div>{quand(l.date_match)}</div>
              <div className="ligne"><span>{l.libelle}</span><b>{Number(l.cote).toFixed(2)}</b></div>
            </div>
          ))}
          <hr />
          <div className="ligne"><span>Mise</span><b>{fmt(t.ticket.mise)} G</b></div>
          <div className="ligne"><span>Cote totale</span><b>{Number(t.ticket.cote_totale).toFixed(2)}</b></div>
          <div className="ligne" style={{ fontSize: '12px' }}><span>GAIN POSSIBLE</span><b>{fmt(t.ticket.gain_potentiel)} G</b></div>
          <hr />
          <div style={{ fontSize: '8px', textAlign: 'center' }}>
            Ticket au porteur : à conserver. Le paiement exige le numéro et le code.<br />
            Gain à réclamer sous {VALIDITE_JOURS} jours après le dernier match.<br />
            Réservé aux 18 ans et plus. Jouez avec modération.
          </div>
        </div>
      )}
    </div>
  );
}
