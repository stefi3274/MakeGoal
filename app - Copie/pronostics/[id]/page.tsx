'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

const VIOLET = '#bf00ff';

const NIVEAUX = [
  { key: 'Kiyès k ap bat ?', emoji: '⚽', color: '#10b981', bg: '#f0fdf4', label: 'Kiyès k ap bat ?' },
  { key: 'Bèl ti stat', emoji: '📊', color: '#3b82f6', bg: '#eff6ff', label: 'Bèl ti stat' },
  { key: 'Kiyès k ap fè Gòl ?', emoji: '🎯', color: '#f59e0b', bg: '#fffbeb', label: 'Kiyès k ap fè Gòl ?' },
  { key: 'Divinò', emoji: '🔮', color: '#eab308', bg: '#fefce8', label: 'Divinò' },
  { key: 'Bèl Mirak', emoji: '🌈', color: '#8b00ff', bg: '#fdf4ff', label: 'Bèl Mirak' },
];

type Pari = {
  id: string;
  niveau: string;
  categorie: string;
  valeur: string;
  cote: number | null;
  confiance: number | null;
  ordre: number;
};

type Pronostic = {
  id: string;
  match: string;
  competition: string | null;
  date_match: string;
  lieu: string | null;
  contexte: string | null;
  confiance_globale: number;
  paris: Pari[];
};

type VoteState = { up: number; down: number; voted: boolean };

const coteToPct = (cote: number | null): string => {
  if (!cote || cote <= 0) return '-';
  return Math.round((1 / cote) * 100) + '%';
};

const pctColor = (cote: number | null): string => {
  if (!cote) return '#6b7280';
  const pct = (1 / cote) * 100;
  if (pct >= 60) return '#10b981';
  if (pct >= 35) return '#f59e0b';
  return '#ef4444';
};

export default function PronosticPage() {
  const params = useParams();
  const id = params?.id as string;
  const [pronostic, setPronostic] = useState<Pronostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [niveauActif, setNiveauActif] = useState('Kiyès k ap bat ?');
  const [vote, setVote] = useState<VoteState>({ up: 0, down: 0, voted: false });
  const [partageMsg, setPartageMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch('/api/pronostics/' + id)
      .then(res => res.json())
      .then(data => {
        setPronostic(data.pronostic || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const etoiles = (n: number | null) => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';

  const voter = async (type: 'up' | 'down') => {
    if (vote.voted || !pronostic) return;
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pronostic_id: pronostic.id, type })
    });
    const data = await res.json();
    if (data.success) setVote({ up: data.up, down: data.down, voted: true });
    else if (data.already) setVote(v => ({ ...v, voted: true }));
  };

  const partagerWhatsApp = async () => {
    if (!pronostic) return;
    const parisDuNiveau = pronostic.paris.filter(x => x.niveau === niveauActif);
    const niv = NIVEAUX.find(n => n.key === niveauActif);
    let texte = '🏆 *MakeGoal — Pronostic*\n';
    texte += '*' + pronostic.match + '*\n';
    if (pronostic.competition) texte += '🏅 ' + pronostic.competition + '\n';
    texte += '📅 ' + formatDate(pronostic.date_match) + '\n\n';
    texte += niv?.emoji + ' *' + niveauActif + '*\n';
    texte += '─────────────────\n';
    parisDuNiveau.slice(0, 5).forEach(p => {
      texte += '▶ ' + p.valeur;
      if (p.cote) texte += ' — ' + coteToPct(p.cote);
      texte += '\n';
    });
    texte += '\n⚠️ Pour information seulement. 18+ uniquement.\n';
    texte += '🌐 makegoal.vercel.app';
    await fetch('/api/partages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pronostic_id: pronostic.id, canal: 'whatsapp' })
    }).catch(() => {});
    window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank');
    setPartageMsg('Partagé ✓');
    setTimeout(() => setPartageMsg(''), 3000);
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <p style={{color:'#9ca3af'}}>Chargement…</p>
      </main>
      <Footer />
    </div>
  );

  if (!pronostic) return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <p style={{color:'#ef4444'}}>Pronostic introuvable.</p>
        <a href="/pronostics" style={{color:VIOLET}}>← Retour aux pronostics</a>
      </main>
      <Footer />
    </div>
  );

  const parisDuNiveau = pronostic.paris.filter(x => x.niveau === niveauActif);
  const nivActif = NIVEAUX.find(n => n.key === niveauActif);
  const niveauxDisponibles = NIVEAUX.filter(n => pronostic.paris.some(p => p.niveau === n.key));

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <style>{`
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .btn-rainbow {
          background: linear-gradient(270deg,#ff0000,#ff7700,#ffff00,#00ff00,#0000ff,#8b00ff);
          background-size: 400% 400%;
          animation: rainbow 3s ease infinite;
          color: white !important;
          border: none !important;
        }
      `}</style>

      <Header />

      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>

        <a href="/pronostics" style={{color:VIOLET,fontSize:'14px',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px',marginBottom:'24px'}}>
          ← Tous les pronostics
        </a>

        {pronostic.competition && (
          <p style={{fontSize:'11px',color:'#9ca3af',margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'1px'}}>{pronostic.competition}</p>
        )}
        <h1 style={{fontWeight:900,fontSize:'32px',margin:'0 0 8px'}}>{pronostic.match}</h1>
        <p style={{fontSize:'14px',color:'#6b7280',margin:'0 0 4px'}}>📅 {formatDate(pronostic.date_match)}</p>
        {pronostic.lieu && <p style={{fontSize:'13px',color:'#9ca3af',margin:'0 0 12px'}}>📍 {pronostic.lieu}</p>}

        <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'#faf5ff',border:'1px solid '+VIOLET,borderRadius:'999px',padding:'4px 14px',marginBottom:'20px'}}>
          <span style={{color:VIOLET,fontSize:'13px',fontWeight:700}}>Confiance : {etoiles(pronostic.confiance_globale)}</span>
        </div>

        {pronostic.contexte && (
          <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:'12px',padding:'16px',marginBottom:'24px'}}>
            <p style={{margin:0,fontSize:'14px',lineHeight:'1.8',color:'#374151'}}>{pronostic.contexte}</p>
          </div>
        )}

        <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
          {niveauxDisponibles.map(niv => (
            <button
              key={niv.key}
              onClick={() => setNiveauActif(niv.key)}
              className={niveauActif === niv.key && niv.key === 'Bèl Mirak' ? 'btn-rainbow' : ''}
              style={{
                padding:'9px 18px', borderRadius:'999px', fontWeight:700, fontSize:'13px', cursor:'pointer',
                border: niv.key === 'Bèl Mirak' ? 'none' : '2px solid ' + niv.color,
                background: niv.key === 'Bèl Mirak'
                  ? (niveauActif === niv.key ? undefined : '#fff')
                  : (niveauActif === niv.key ? niv.color : '#fff'),
                color: niv.key === 'Bèl Mirak'
                  ? (niveauActif === niv.key ? '#fff' : '#8b00ff')
                  : (niveauActif === niv.key ? '#fff' : niv.color),
                outline: niv.key === 'Bèl Mirak' && niveauActif !== niv.key ? '2px solid #8b00ff' : 'none',
              }}
            >
              {niv.emoji} {niv.label}
            </button>
          ))}
        </div>

        <div style={{background: nivActif?.bg || '#f9fafb', borderRadius:'12px', padding:'16px', marginBottom:'20px'}}>
          {parisDuNiveau.length === 0 ? (
            <p style={{color:'#9ca3af',fontSize:'14px',margin:0,textAlign:'center'}}>Pas de paris dans ce niveau.</p>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid rgba(0,0,0,0.08)',textAlign:'left'}}>
                    <th style={{padding:'10px 8px',fontWeight:700,color:'#374151'}}>Catégorie</th>
                    <th style={{padding:'10px 8px',fontWeight:700,color:'#374151'}}>Pari</th>
                    <th style={{padding:'10px 8px',fontWeight:700,textAlign:'center',color:'#374151'}}>Chances</th>
                    <th style={{padding:'10px 8px',fontWeight:700,textAlign:'center',color:'#374151'}}>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {parisDuNiveau.map(pari => (
                    <tr key={pari.id} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                      <td style={{padding:'10px 8px',color:'#6b7280',fontSize:'12px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>{pari.categorie}</td>
                      <td style={{padding:'10px 8px',fontWeight:600,color:'#111'}}>{pari.valeur}</td>
                      <td style={{padding:'10px 8px',textAlign:'center'}}>
                        <span style={{
                          display:'inline-block',
                          background: pctColor(pari.cote) + '20',
                          color: pctColor(pari.cote),
                          fontWeight:900, fontSize:'15px',
                          padding:'4px 10px', borderRadius:'999px'
                        }}>
                          {coteToPct(pari.cote)}
                        </span>
                      </td>
                      <td style={{padding:'10px 8px',textAlign:'center',color:'#f59e0b',fontSize:'13px'}}>
                        {etoiles(pari.confiance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <button onClick={() => voter('up')} disabled={vote.voted} style={{
              padding:'8px 18px', borderRadius:'999px',
              border:'2px solid #10b981',
              background: vote.voted ? '#f0fdf4' : '#fff',
              color:'#10b981', fontWeight:700, fontSize:'15px',
              cursor: vote.voted ? 'default' : 'pointer'
            }}>
              👍 {vote.up > 0 ? vote.up : ''}
            </button>
            <button onClick={() => voter('down')} disabled={vote.voted} style={{
              padding:'8px 18px', borderRadius:'999px',
              border:'2px solid #ef4444',
              background: vote.voted ? '#fef2f2' : '#fff',
              color:'#ef4444', fontWeight:700, fontSize:'15px',
              cursor: vote.voted ? 'default' : 'pointer'
            }}>
              👎 {vote.down > 0 ? vote.down : ''}
            </button>
            {vote.voted && <span style={{fontSize:'12px',color:'#9ca3af'}}>✓ Vote enregistré</span>}
          </div>

          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {partageMsg && <span style={{fontSize:'13px',color:'#10b981',fontWeight:700}}>{partageMsg}</span>}
            <button onClick={partagerWhatsApp} style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'10px 22px', borderRadius:'999px',
              background:'#25D366', color:'#fff',
              border:'none', fontWeight:700, fontSize:'14px',
              cursor:'pointer', boxShadow:'0 2px 8px rgba(37,211,102,0.4)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Partager
            </button>
          </div>
        </div>

        <div style={{marginTop:'32px',padding:'20px',background:'#fef2f2',borderRadius:'12px',borderLeft:'4px solid #dc2626'}}>
          <p style={{fontSize:'13px',color:'#374151',margin:0,lineHeight:'1.6'}}>
            <strong>Avertissement :</strong> Ces pronostics sont fournis à titre informatif uniquement. Ils ne garantissent aucun résultat. 18+ uniquement. <a href="/jeu-responsable" style={{color:VIOLET}}>Jeu responsable</a>.
          </p>
        </div>

      </main>
      <Footer />
    </div>
  );
}
