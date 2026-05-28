'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

type Pari = {
  id: string;
  niveau: 'Simple' | 'Complexe' | 'Divin';
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

const VIOLET = '#bf00ff';

export default function Pronostics() {
  const [pronostics, setPronostics] = useState<Pronostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [niveauActif, setNiveauActif] = useState<'Simple' | 'Complexe' | 'Divin'>('Simple');

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
  const couleurNiveau = (niv: string) =>
    niv === 'Simple' ? '#10b981' : niv === 'Complexe' ? '#f59e0b' : VIOLET;

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>
          Pronostics MakeGoal
        </h1>
        <p style={{color:'#6b7280',fontSize:'16px',marginBottom:'32px'}}>
          Analyses raisonnées sur 3 niveaux. À titre indicatif — pariez avec modération.
        </p>

        {loading && <p style={{color:'#9ca3af'}}>Chargement…</p>}

        {!loading && pronostics.length === 0 && (
          <div style={{background:'#f9fafb',padding:'32px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Aucun pronostic publié pour le moment.</p>
          </div>
        )}

        {!loading && pronostics.map((p) => {
          const parisDuNiveau = p.paris.filter(x => x.niveau === niveauActif);
          return (
            <article key={p.id} style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'24px'}}>
              {p.competition && (
                <p style={{fontSize:'12px',color:'#9ca3af',margin:0,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>
                  {p.competition}
                </p>
              )}
              <h2 style={{fontWeight:900,fontSize:'26px',marginBottom:'8px'}}>{p.match}</h2>
              <p style={{fontSize:'14px',color:'#6b7280',margin:0,marginBottom:'4px'}}>{formatDate(p.date_match)}</p>
              {p.lieu && <p style={{fontSize:'13px',color:'#9ca3af',margin:0,marginBottom:'8px'}}>{p.lieu}</p>}
              <p style={{fontSize:'13px',color:VIOLET,fontWeight:700,marginBottom:'16px'}}>
                Confiance globale : {etoiles(p.confiance_globale)}
              </p>

              {p.contexte && (
                <div style={{background:'#faf5ff',border:'1px solid ' + VIOLET,borderRadius:'12px',padding:'16px',marginBottom:'20px'}}>
                  <p style={{margin:0,fontSize:'14px',lineHeight:'1.7',color:'#374151'}}>{p.contexte}</p>
                </div>
              )}

              <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
                {(['Simple', 'Complexe', 'Divin'] as const).map((niv) => (
                  <button key={niv} onClick={() => setNiveauActif(niv)} style={{
                    padding:'8px 20px', borderRadius:'999px',
                    border:'2px solid ' + couleurNiveau(niv),
                    background: niveauActif === niv ? couleurNiveau(niv) : '#ffffff',
                    color: niveauActif === niv ? '#ffffff' : couleurNiveau(niv),
                    fontWeight:700, fontSize:'14px', cursor:'pointer'
                  }}>
                    {niv}
                  </button>
                ))}
              </div>

              <p style={{fontSize:'12px',color:'#6b7280',marginBottom:'12px',fontStyle:'italic'}}>
                {niveauActif === 'Simple' && '🟢 Paris accessibles : résultats et double chance.'}
                {niveauActif === 'Complexe' && '🟠 Paris d\'analyse : statistiques détaillées.'}
                {niveauActif === 'Divin' && '🟣 Paris premium : buteurs et scores exacts.'}
              </p>

              {parisDuNiveau.length === 0 ? (
                <p style={{color:'#9ca3af',fontSize:'14px'}}>Aucun pari dans ce niveau.</p>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px'}}>
                    <thead>
                      <tr style={{borderBottom:'2px solid #e5e7eb',textAlign:'left'}}>
                        <th style={{padding:'10px 8px',fontWeight:700}}>Catégorie</th>
                        <th style={{padding:'10px 8px',fontWeight:700}}>Pari</th>
                        <th style={{padding:'10px 8px',fontWeight:700,textAlign:'center'}}>Cote</th>
                        <th style={{padding:'10px 8px',fontWeight:700,textAlign:'center'}}>Confiance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parisDuNiveau.map((pari) => (
                        <tr key={pari.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                          <td style={{padding:'10px 8px',color:'#6b7280',fontSize:'13px'}}>{pari.categorie}</td>
                          <td style={{padding:'10px 8px',fontWeight:600}}>{pari.valeur}</td>
                          <td style={{padding:'10px 8px',textAlign:'center',color:VIOLET,fontWeight:700}}>
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
            </article>
          );
        })}

        <div style={{marginTop:'32px',padding:'20px',background:'#fef2f2',borderRadius:'12px',borderLeft:'4px solid #dc2626'}}>
          <p style={{fontSize:'13px',color:'#374151',margin:0,lineHeight:'1.6'}}>
            <strong>Rappel :</strong> Ces pronostics sont fournis à titre purement indicatif. Aucune garantie de gain. Réservé aux personnes majeures (18+). <a href="/jeu-responsable" style={{color:VIOLET}}>Jeu responsable</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
          }
