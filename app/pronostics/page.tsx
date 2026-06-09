'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';
const NIVEAUX = [
  { key: 'Kiyès k ap bat ?', label: 'Kiyès k ap bat ?', color: '#10b981', emoji: '⚽' },
  { key: 'Bèl ti stat', label: 'Bèl ti stat', color: '#3b82f6', emoji: '📊' },
  { key: 'Kiyès k ap fè Goal ?', label: 'Kiyès k ap fè Goal ?', color: '#f59e0b', emoji: '🎯' },
  { key: 'Divinò', label: 'Divinò ✨', color: '#eab308', emoji: '🔮' },
] as const;

type Niveau = 'Kiyès k ap bat ?' | 'Bèl ti stat' | 'Kiyès k ap fè Goal ?' | 'Divinò';

type Pari = {
  id: string;
  niveau: Niveau;
  categorie: string;
  type_pari: string;
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

export default function Pronostics() {
  const [pronostics, setPronostics] = useState<Pronostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [niveauActif, setNiveauActif] = useState<Niveau>('Kiyès k ap bat ?');
  const [votes, setVotes] = useState<Record<string, VoteState>>({});
  const [partageMsg, setPartageMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/pronostics')
      .then(res => res.json())
      .then(data => {
        setPronostics(data.pronostics || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const etoiles = (n: number | null) => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';
  const couleurNiveau = (niv: string) => NIVEAUX.find(n => n.key === niv)?.color || VIOLET;

  const voter = async (pronostic_id: string, type: 'up' | 'down') => {
    if (votes[pronostic_id]?.voted) return;
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pronostic_id, type })
    });
    const data = await res.json();
    if (data.already) {
      setVotes(v => ({ ...v, [pronostic_id]: { ...v[pronostic_id], voted: true } }));
      return;
    }
    if (data.success) {
      setVotes(v => ({ ...v, [pronostic_id]: { up: data.up, down: data.down, voted: true } }));
    }
  };

  const partagerWhatsApp = async (p: Pronostic) => {
    const parisDuNiveau = p.paris.filter(x => x.niveau === niveauActif);
    const niv = NIVEAUX.find(n => n.key === niveauActif);

    let texte = '🏆 *MakeGoal — Pronostic*\n';
    texte += '*' + p.match + '*\n';
    if (p.competition) texte += '🏅 ' + p.competition + '\n';
    texte += '📅 ' + formatDate(p.date_match) + '\n';
    texte += '⭐ Confiance : ' + etoiles(p.confiance_globale) + '\n\n';
    texte += niv?.emoji + ' *' + niveauActif + '*\n';
    texte += '─────────────────\n';

    parisDuNiveau.slice(0, 5).forEach(pari => {
      texte += '▶ ' + pari.valeur;
      if (pari.cote) texte += ' @ *' + pari.cote.toFixed(2) + '*';
      texte += '\n';
    });

    texte += '\n⚠️ Paris à titre indicatif. 18+ uniquement.\n';
    texte += '🌐 makegoal.vercel.app';

    await fetch('/api/partages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pronostic_id: p.id, canal: 'whatsapp' })
    }).catch(() => {});

    const encoded = encodeURIComponent(texte);
    window.open('https://wa.me/?text=' + encoded, '_blank');

    setPartageMsg(m => ({ ...m, [p.id]: 'Partagé !' }));
    setTimeout(() => setPartageMsg(m => ({ ...m, [p.id]: '' })), 3000);
  };return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>
          Pronostics MakeGoal
        </h1>
        <p style={{color:'#6b7280',fontSize:'16px',marginBottom:'32px'}}>
          Analiz reyèl. Chif onèt. Pou pariè ki konnen kisa yo fè.
        </p>

        {loading && <p style={{color:'#9ca3af'}}>Chargement…</p>}

        {!loading && pronostics.length === 0 && (
          <div style={{background:'#f9fafb',padding:'32px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Okenn pwonostic piblie pou kounye a.</p>
          </div>
        )}

        {!loading && pronostics.map((p) => {
          const parisDuNiveau = p.paris.filter(x => x.niveau === niveauActif);
          const voteP = votes[p.id] || { up: 0, down: 0, voted: false };

          return (
            <article key={p.id} style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'24px'}}>
              {p.competition && (
                <p style={{fontSize:'12px',color:'#9ca3af',margin:0,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>{p.competition}</p>
              )}
              <h2 style={{fontWeight:900,fontSize:'26px',marginBottom:'8px'}}>{p.match}</h2>
              <p style={{fontSize:'14px',color:'#6b7280',margin:0,marginBottom:'4px'}}>{formatDate(p.date_match)}</p>
              {p.lieu && <p style={{fontSize:'13px',color:'#9ca3af',margin:0,marginBottom:'8px'}}>📍 {p.lieu}</p>}
              <p style={{fontSize:'13px',color:VIOLET,fontWeight:700,marginBottom:'16px'}}>
                Konfyans global : {etoiles(p.confiance_globale)}
              </p>

              {p.contexte && (
                <div style={{background:'#faf5ff',border:'1px solid ' + VIOLET,borderRadius:'12px',padding:'16px',marginBottom:'20px'}}>
                  <p style={{margin:0,fontSize:'14px',lineHeight:'1.7',color:'#374151'}}>{p.contexte}</p>
                </div>
              )}

              <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
                {NIVEAUX.map((niv) => (
                  <button key={niv.key} onClick={() => setNiveauActif(niv.key as Niveau)} style={{
                    padding:'8px 16px', borderRadius:'999px',
                    border:'2px solid ' + niv.color,
                    background: niveauActif === niv.key ? niv.color : '#ffffff',
                    color: niveauActif === niv.key ? '#ffffff' : niv.color,
                    fontWeight:700, fontSize:'13px', cursor:'pointer'
                  }}>
                    {niv.emoji} {niv.label}
                  </button>
                ))}
              </div>

              {parisDuNiveau.length === 0 ? (
                <p style={{color:'#9ca3af',fontSize:'14px'}}>Okenn pari nan nivo sa a.</p>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid #e5e7eb',textAlign:'left'}}>
                        <th style={{padding:'10px 8px',fontWeight:700}}>Kategori</th>
                        <th style={{padding:'10px 8px',fontWeight:700}}>Pari</th>
                        <th style={{padding:'10px 8px',fontWeight:700,textAlign:'center'}}>Cote</th>
                        <th style={{padding:'10px 8px',fontWeight:700,textAlign:'center'}}>Konfyans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parisDuNiveau.map((pari) => (<tr key={pari.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                          <td style={{padding:'10px 8px',color:'#6b7280',fontSize:'13px'}}>{pari.categorie}</td>
                          <td style={{padding:'10px 8px',fontWeight:600}}>{pari.valeur}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:couleurNiveau(pari.niveau),fontWeight:700}}>
                            {pari.cote ? pari.cote.toFixed(2) : '-'}
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

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'20px',flexWrap:'wrap',gap:'12px'}}>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <button
                    onClick={() => voter(p.id, 'up')}
                    disabled={voteP.voted}
                    style={{
                      padding:'8px 16px', borderRadius:'999px',
                      border:'2px solid #10b981',
                      background: voteP.voted ? '#f0fdf4' : '#ffffff',
                      color:'#10b981', fontWeight:700, fontSize:'14px',
                      cursor: voteP.voted ? 'not-allowed' : 'pointer'
                    }}
                  >
                    👍 {voteP.up > 0 ? voteP.up : ''}
                  </button>
                  <button
                    onClick={() => voter(p.id, 'down')}
                    disabled={voteP.voted}
                    style={{
                      padding:'8px 16px', borderRadius:'999px',
                      border:'2px solid #ef4444',
                      background: voteP.voted ? '#fef2f2' : '#ffffff',
                      color:'#ef4444', fontWeight:700, fontSize:'14px',
                      cursor: voteP.voted ? 'not-allowed' : 'pointer'
                    }}
                  >
                    👎 {voteP.down > 0 ? voteP.down : ''}
                  </button>
                  {voteP.voted && <span style={{fontSize:'12px',color:'#9ca3af'}}>Vòt ou anrejistre ✓</span>}
                </div>

                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  {partageMsg[p.id] && (
                    <span style={{fontSize:'12px',color:'#10b981',fontWeight:700}}>{partageMsg[p.id]}</span>
                  )}
                  <button
                    onClick={() => partagerWhatsApp(p)}
                    style={{
                      display:'flex', alignItems:'center', gap:'6px',
                      padding:'8px 20px', borderRadius:'999px',
                      background:'#25D366', color:'#ffffff',
                      border:'none', fontWeight:700, fontSize:'14px',
                      cursor:'pointer'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Pataje
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        <div style={{marginTop:'32px',padding:'20px',background:'#fef2f2',borderRadius:'12px',borderLeft:'4px solid #dc2626'}}>
          <p style={{fontSize:'13px',color:'#374151',margin:0,lineHeight:'1.6'}}>
            <strong>Atansyon :</strong> Pwonostic yo se pou enfòmasyon sèlman. Yo pa garanti okenn rezilta. 18+ sèlman. <a href="/jeu-responsable" style={{color:VIOLET}}>Jwèt responsab</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}