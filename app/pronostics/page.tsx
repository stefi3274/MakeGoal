'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

type Pronostic = {
  id: string;
  match: string;
  competition: string | null;
  date_match: string;
  lieu: string | null;
  confiance_globale: number;
};

export default function Pronostics() {
  const [pronostics, setPronostics] = useState<Pronostic[]>([]);
  const [loading, setLoading] = useState(true);

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

  const etoiles = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>
          Pronostics MakeGoal
        </h1>
        <p style={{color:'#6b7280',fontSize:'16px',marginBottom:'32px'}}>
          Bonne analyse. Bons chiffres. Pour parier intelligemment.
        </p>

        {loading && <p style={{color:'#9ca3af'}}>Chargement…</p>}

        {!loading && pronostics.length === 0 && (
          <div style={{background:'#f9fafb',padding:'32px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Pas encore de pronostic.</p>
          </div>
        )}

        {!loading && pronostics.map(p => (
          <a key={p.id} href={'/pronostics/' + p.id} style={{textDecoration:'none',color:'inherit',display:'block'}}>
            <div style={{
              border:'1px solid #e5e7eb', borderRadius:'20px', padding:'24px',
              marginBottom:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
              cursor:'pointer'
            }}>
              {p.competition && (
                <p style={{fontSize:'11px',color:'#9ca3af',margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'1px'}}>{p.competition}</p>
              )}
              <h2 style={{fontWeight:900,fontSize:'24px',margin:'0 0 8px'}}>{p.match}</h2>
              <p style={{fontSize:'14px',color:'#6b7280',margin:'0 0 4px'}}>📅 {formatDate(p.date_match)}</p>
              {p.lieu && <p style={{fontSize:'13px',color:'#9ca3af',margin:'0 0 12px'}}>📍 {p.lieu}</p>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:VIOLET,fontSize:'13px',fontWeight:700}}>
                  Confiance : {etoiles(p.confiance_globale)}
                </span>
                <span style={{
                  background:VIOLET, color:'#fff',
                  padding:'8px 20px', borderRadius:'999px',
                  fontWeight:700, fontSize:'13px',
                  boxShadow:'0 2px 8px rgba(191,0,255,0.3)'
                }}>
                  ⚽ Voir le pronostic →
                </span>
              </div>
            </div>
          </a>
        ))}

        <div style={{marginTop:'32px',padding:'20px',background:'#fef2f2',borderRadius:'12px',borderLeft:'4px solid #dc2626'}}>
          <p style={{fontSize:'13px',color:'#374151',margin:0,lineHeight:'1.6'}}>
            <strong>Avertissement :</strong> Ces pronostics sont fournis à titre informatif uniquement. 18+ uniquement. <a href="/jeu-responsable" style={{color:VIOLET}}>Jeu responsable</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}