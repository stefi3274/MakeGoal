'use client';
import { useEffect, useState } from 'react';
import { MATCHES, GROUP_COLORS, Match } from '../data/matches';
import Header from '../components/Header';
import Footer from '../components/Footer';

const VIOLET = '#bf00ff';

const FLAG_CODES: Record<string, string> = {
  'Mexique':'mx','Afrique du Sud':'za','Corée du Sud':'kr','Rép. Tchèque':'cz',
  'Canada':'ca','Qatar':'qa','Bosnie-Herzégovine':'ba','Suisse':'ch',
  'Brésil':'br','Écosse':'gb-sct','Maroc':'ma','Haïti':'ht',
  'États-Unis':'us','Türkiye':'tr','Paraguay':'py','Australie':'au',
  'Allemagne':'de','Équateur':'ec',"Côte d'Ivoire":'ci','Curaçao':'cw',
  'Pays-Bas':'nl','Tunisie':'tn','Japon':'jp','Suède':'se',
  'Belgique':'be','Nouvelle-Zélande':'nz','Égypte':'eg','Iran':'ir',
  'Espagne':'es','Cap-Vert':'cv','Uruguay':'uy','Arabie Saoudite':'sa',
  'France':'fr','Irak':'iq','Sénégal':'sn','Norvège':'no',
  'Argentine':'ar','Jordanie':'jo','Algérie':'dz','Autriche':'at',
  'Portugal':'pt','RD Congo':'cd','Colombie':'co','Ouzbékistan':'uz',
  'Angleterre':'gb-eng','Panama':'pa','Croatie':'hr','Ghana':'gh',
};

const getFlagCode = (pays: string) => FLAG_CODES[pays] || 'un';

type Pronostic = { id: string; match: string; publie: boolean; };
type Score = { match_id: number; home_score: number; away_score: number; statut: string; };

const MOIS: Record<string, number> = {
  'janvier':1,'février':2,'mars':3,'avril':4,'mai':5,'juin':6,
  'juillet':7,'août':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12
};

const estAujourdhui = (dateStr: string) => {
  const now = new Date();
  const parts = dateStr.trim().split(' ');
  if (parts.length < 2) return false;
  const jour = parseInt(parts[0]);
  const mois = MOIS[parts[1].toLowerCase()];
  if (!mois) return false;
  return now.getDate() === jour && (now.getMonth() + 1) === mois;
};

export default function Home() {
  const [pronostics, setPronostics] = useState<Pronostic[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [groupeActif, setGroupeActif] = useState('');
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => {
    fetch('/api/pronostics')
      .then(res => res.json())
      .then(data => setPronostics(data.pronostics || []));
    fetch('/api/scores')
      .then(res => res.json())
      .then(data => setScores(data.scores || []));
  }, []);

  const groupes = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const matchsDuJour = MATCHES.filter(m => estAujourdhui(m.date));
  const getPronostic = (m: Match) => pronostics.find(p => p.match === m.home + ' vs ' + m.away);
  const getScore = (m: Match) => scores.find(s => s.match_id === m.id);
  const matchesParGroupe = (g: string) => MATCHES.filter(m => m.group === g);

  const inscrireNewsletter = async () => {
    if (!email) return;
    await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    setNewsletterMsg('Merci ! Vous êtes inscrit avec succès.');
    setEmail('');
  };

  const CarteMatch = ({ m }: { m: Match }) => {
    const prono = getPronostic(m);
    const score = getScore(m);
    const estHaiti = m.home === 'Haïti' || m.away === 'Haïti';
    const couleurGroupe = GROUP_COLORS[m.group];
    return (
      <div style={{
        border: estHaiti ? '2px solid #D21034' : '2px solid ' + couleurGroupe + '40',
        borderRadius:'16px', padding:'20px', marginBottom:'12px',
        background: estHaiti ? '#fff5f5' : couleurGroupe + '08',
        boxShadow: '0 2px 8px ' + couleurGroupe + '30'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px',flexWrap:'wrap',gap:'8px'}}>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <span style={{background:couleurGroupe,color:'#fff',fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'999px'}}>
              Groupe {m.group}
            </span>
            {m.label && <span style={{background:'#111',color:'#fff',fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'999px'}}>{m.label}</span>}
            {estHaiti && <span className="haiti-badge" style={{fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'999px'}}>🇭🇹 HAÏTI</span>}
            {score && <span style={{background:score.statut==='final'?'#10b981':score.statut==='en cours'?'#f59e0b':'#6b7280',color:'#fff',fontSize:'11px',fontWeight:700,padding:'2px 10px',borderRadius:'999px'}}>{score.statut}</span>}
          </div>
          <span style={{fontSize:'12px',color:'#9ca3af'}}>{m.day} {m.date} · {m.time} · {m.city}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1}}>
            <div style={{textAlign:'center',minWidth:'80px'}}>
              <img src={'https://flagcdn.com/48x36/' + getFlagCode(m.home) + '.png'} alt={m.home} style={{width:'48px',height:'36px',borderRadius:'4px',objectFit:'cover'}}/>
              <p style={{fontWeight:700,fontSize:'13px',margin:'4px 0 0',color:'#111'}}>{m.home}</p>
            </div>
            <div style={{textAlign:'center',flex:1}}>
              {score ? (
                <p style={{fontWeight:900,fontSize:'28px',color:'#111',margin:0}}>{score.home_score} — {score.away_score}</p>
              ) : (
                <p style={{fontWeight:900,fontSize:'20px',color:'#9ca3af',margin:0}}>VS</p>
              )}
              <p style={{fontSize:'11px',color:'#9ca3af',margin:'4px 0 0'}}>🏟️ {m.stadium}</p>
            </div>
            <div style={{textAlign:'center',minWidth:'80px'}}>
              <img src={'https://flagcdn.com/48x36/' + getFlagCode(m.away) + '.png'} alt={m.away} style={{width:'48px',height:'36px',borderRadius:'4px',objectFit:'cover'}}/>
              <p style={{fontWeight:700,fontSize:'13px',margin:'4px 0 0',color:'#111'}}>{m.away}</p>
            </div>
          </div>
          <div style={{flexShrink:0}}>
            {prono ? (
              <a href={'/pronostics/' + prono.id} style={{
                display:'inline-block',background:VIOLET,color:'#fff',
                padding:'10px 20px',borderRadius:'999px',fontWeight:700,
                fontSize:'13px',textDecoration:'none',
                boxShadow:'0 2px 8px rgba(191,0,255,0.3)'
              }}>
                ⚽ Pronostic →
              </a>
            ) : (
              <span style={{fontSize:'12px',color:'#9ca3af',fontStyle:'italic'}}>Pronostic à venir</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <style>{`
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .haiti-badge {
          background: linear-gradient(270deg, #003087, #D21034);
          color: white;
          background-size: 400% 400%;
          animation: rainbow 4s ease infinite;
        }
      `}</style>

      <Header />

      <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(28px,5vw,52px)',margin:'0 0 12px'}}>
          🏆 MakeGoal
        </h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'18px',margin:'0 0 24px'}}>
          Bonne analyse. Bons chiffres. Pour parier intelligemment.
        </p>
        <a href="/pronostics" style={{background:'#fff',color:VIOLET,padding:'12px 28px',borderRadius:'999px',fontWeight:900,fontSize:'16px',textDecoration:'none'}}>
          ⚽ Pronostics
        </a>
      </div>

      <div style={{background:'#003087',padding:'16px 24px',textAlign:'center'}}>
        <p style={{color:'#fff',margin:0,fontSize:'15px',fontWeight:700}}>
          🇭🇹 <span style={{color:'#D21034'}}>HAÏTI</span> au Mondial 2026 — Groupe C — Boston · Philadelphie · Atlanta
        </p>
      </div>

      <main style={{maxWidth:'1000px',margin:'0 auto',padding:'32px 16px'}}>

        {matchsDuJour.length > 0 && (
          <div style={{marginBottom:'32px'}}>
            <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
              🔴 <span style={{color:'#ef4444'}}>Matchs du jour</span>
            </h2>
            {matchsDuJour.map(m => <CarteMatch key={m.id} m={m} />)}
          </div>
        )}

        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'24px',justifyContent:'center'}}>
          {groupes.map(g => (
            <button key={g} onClick={() => setGroupeActif(groupeActif === g ? '' : g)} style={{
              padding:'8px 18px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer',
              background: groupeActif === g ? GROUP_COLORS[g] : '#f3f4f6',
              color: groupeActif === g ? '#fff' : '#374151',
              border:'none',
              boxShadow: groupeActif === g ? '0 2px 8px ' + GROUP_COLORS[g] + '80' : 'none'
            }}>
              Groupe {g}
            </button>
          ))}
        </div>

        <div>
          {groupeActif && matchesParGroupe(groupeActif).map(m => <CarteMatch key={m.id} m={m} />)}
          {!groupeActif && (
            <p style={{color:'#9ca3af',textAlign:'center',fontSize:'14px',padding:'20px'}}>
              Sélectionnez un groupe pour voir les matchs.
            </p>
          )}
        </div>

        <div style={{marginTop:'48px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'8px'}}>
            📬 Recevoir les pronostics
          </h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'15px',marginBottom:'20px'}}>
            Entrez votre email pour recevoir les analyses MakeGoal avant chaque match.
          </p>
          {newsletterMsg ? (
            <p style={{color:'#10b981',fontWeight:700,fontSize:'16px'}}>{newsletterMsg}</p>
          ) : (
            <div style={{display:'flex',gap:'8px',maxWidth:'400px',margin:'0 auto',flexWrap:'wrap'}}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                style={{flex:1,padding:'12px 16px',borderRadius:'999px',border:'none',fontSize:'14px',minWidth:'200px'}}
              />
              <button onClick={inscrireNewsletter} style={{background:'#fff',color:VIOLET,padding:'12px 24px',borderRadius:'999px',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                S'inscrire
              </button>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}
