'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Footer from '../components/Footer';

type Match = {
  idEvent: string;
  dateEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
};

const VIOLET = '#bf00ff';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/ligue1')
      .then(res => res.json())
      .then(data => {
        if (data.events) setMatches(data.events.slice(0, 5));
      });
  }, []);

  const scrollToMatchs = () => {
    const el = document.getElementById('matchs');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubscribe = async () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setMessage('Adresse email invalide.');
      return;
    }
    setLoading(true);
    setMessage('');
    const { error } = await supabase.from('newsletter').insert({ email: email });
    setLoading(false);
    if (error) {
      if (error.code === '23505') {
        setMessage('Cet email est déjà inscrit.');
      } else {
        setMessage('Une erreur est survenue. Réessayez.');
      }
    } else {
      setMessage('Merci ! Vous êtes inscrit.');
      setEmail('');
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <header style={{background:'#ffffff',borderBottom:'3px solid ' + VIOLET,padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'20px',margin:0}}>MakeGoal</h1>
          <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>Jouez intelligemment !</p>
        </div>
        <nav style={{display:'flex',gap:'12px',alignItems:'center',fontSize:'14px',fontWeight:600}}>
          <span style={{color:VIOLET,fontWeight:900,fontSize:'11px',border:'1px solid ' + VIOLET,padding:'2px 8px',borderRadius:'999px'}}>18+</span>
          <button onClick={scrollToMatchs} style={{color:VIOLET,background:'none',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Matchs</button>
          <button onClick={() => alert('Pronostics — bientôt disponible !')} style={{color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Pronostics</button>
          <button onClick={() => alert('Stats — bientôt disponible !')} style={{color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Stats</button>
        </nav>
      </header>

      <section style={{background:VIOLET,color:'#ffffff',textAlign:'center',padding:'64px 16px'}}>
        <h2 style={{fontSize:'40px',fontWeight:900,marginBottom:'16px'}}>Jouez intelligemment.</h2>
        <button
          onClick={scrollToMatchs}
          style={{background:'#ffffff',color:VIOLET,fontWeight:900,padding:'12px 40px',borderRadius:'999px',border:'none',cursor:'pointer'}}
        >
          Voir les matchs
        </button>
      </section>

      <section id="matchs" style={{padding:'32px 16px',maxWidth:'960px',margin:'0 auto'}}>
        <h3 style={{fontWeight:900,marginBottom:'16px'}}>Ligue 1 — Prochains matchs</h3>
        {matches.length === 0 && (
          <p style={{color:'#9ca3af'}}>Chargement des matchs…</p>
        )}
        {matches.map((match) => (
          <div
            key={match.idEvent}
            style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'16px',marginBottom:'12px',cursor:'pointer'}}
          >
            <p style={{color:'#9ca3af',fontSize:'12px',marginBottom:'8px'}}>{match.dateEvent}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{fontWeight:700}}>{match.strHomeTeam}</p>
              <p style={{color:VIOLET,fontWeight:900}}>VS</p>
              <p style={{fontWeight:700}}>{match.strAwayTeam}</p>
            </div>
          </div>
        ))}
      </section>

      <section style={{background:'#f9fafb',padding:'48px 16px',textAlign:'center'}}>
        <h3 style={{fontWeight:900,fontSize:'24px',marginBottom:'8px'}}>Newsletter MakeGoal</h3>
        <p style={{color:'#6b7280',marginBottom:'24px'}}>Recevez les pronostics et les matchs à venir.</p>
        <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap',maxWidth:'420px',margin:'0 auto'}}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email"
            style={{flex:1,minWidth:'200px',padding:'12px 16px',borderRadius:'999px',border:'1px solid #d1d5db',fontSize:'14px'}}
          />
          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{background:VIOLET,color:'#ffffff',fontWeight:900,padding:'12px 28px',borderRadius:'999px',border:'none',cursor:'pointer'}}
          >
            {loading ? '...' : "S'inscrire"}
          </button>
        </div>
        {message && (
          <p style={{marginTop:'16px',fontWeight:600,color:VIOLET}}>{message}</p>
        )}
        <p style={{marginTop:'16px',fontSize:'12px',color:'#9ca3af'}}>
          En vous inscrivant, vous acceptez notre <a href="/confidentialite" style={{color:VIOLET}}>politique de confidentialité</a>.
        </p>
      </section>

      <Footer />
    </div>
  );
          }
