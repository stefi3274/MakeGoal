'use client';
import { useEffect, useRef, useState } from 'react';
import { genererVideos, typeVideo, VideoPost } from '../lib/video';

const VIOLET = '#bf00ff';

const slugify = (t: string) =>
  (t || 'video').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'video';

type Props = { post: VideoPost; titre: string; onFermer: () => void };

// Fenêtre de génération vidéo : enregistre dans le navigateur (une seule vidéo) puis propose le
// téléchargement.
export default function VideoModal({ post, titre, onFermer }: Props) {
  const [pct, setPct] = useState(0);
  const [etape, setEtape] = useState('Préparation…');
  const [erreur, setErreur] = useState('');
  const [parties, setParties] = useState<{ url: string; duree: number; ext: string }[]>([]);
  const signal = useRef({ annule: false });
  const urls = useRef<string[]>([]);

  useEffect(() => {
    signal.current = { annule: false };
    let vivant = true;
    (async () => {
      try {
        const r = await genererVideos(post, (p, e) => { if (vivant) { setPct(p); setEtape(e); } }, signal.current);
        if (!vivant) return;
        const liste = r.map(x => { const url = URL.createObjectURL(x.blob); urls.current.push(url); return { url, duree: Math.round(x.duree), ext: x.ext }; });
        setParties(liste);
      } catch (err) {
        if (vivant && !(err instanceof Error && err.message === 'annulé')) setErreur(err instanceof Error ? err.message : 'Erreur vidéo');
      }
    })();
    return () => { vivant = false; signal.current.annule = true; urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#161616', border: '1px solid #333', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '420px', maxHeight: '94vh', overflowY: 'auto', color: '#fff' }}>
        <p style={{ fontWeight: 900, fontSize: '15px', margin: '0 0 4px' }}>🎬 Vidéo · {typeVideo(post)}</p>
        <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 14px' }}>{titre}</p>
        {erreur ? (
          <p style={{ color: '#f87171', fontSize: '13px', fontWeight: 700 }}>❌ {erreur}</p>
        ) : parties.length === 0 ? (
          <div>
            <div style={{ height: '10px', background: '#2a2a2a', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#bf00ff,#ff7a00)', transition: 'width .2s' }} />
            </div>
            <p style={{ fontSize: '12px', color: '#d1d5db', margin: 0 }}>{etape} {pct}%</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '8px 0 0' }}>Gardez cet onglet ouvert et visible pendant l&apos;enregistrement (environ la durée de la vidéo).</p>
          </div>
        ) : (
          <div>
            {parties.length > 1 && <p style={{ fontSize: '12px', color: '#d1d5db', margin: '0 0 10px' }}>La vidéo est longue : elle est livrée en {parties.length} parties, à publier dans l&apos;ordre.</p>}
            {parties.map((x, i) => (
              <a key={i} href={x.url} download={'makegoal-' + slugify(titre) + (parties.length > 1 ? '-partie' + (i + 1) : '') + '.' + x.ext}
                style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '999px', background: VIOLET, color: '#fff', fontWeight: 900, fontSize: '13px', textDecoration: 'none', marginBottom: '8px' }}>
                ⬇️ Télécharger{parties.length > 1 ? ' la partie ' + (i + 1) + '/' + parties.length : ' la vidéo'} ({x.duree} s · .{x.ext})
              </a>
            ))}
          </div>
        )}
        <button onClick={onFermer} style={{ width: '100%', padding: '10px', borderRadius: '999px', border: '1px solid #444', background: 'transparent', color: '#d1d5db', fontWeight: 700, fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>{parties.length > 0 || erreur ? 'Fermer' : 'Annuler'}</button>
      </div>
    </div>
  );
}
