'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { MATCHES } from '../../data/matches';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

type FavEquipe = { id: string; equipe: string; };
type FavMatch = { id: string; match_id: number; };

export default function Profil() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [favEquipes, setFavEquipes] = useState<FavEquipe[]>([]);
  const [favMatchs, setFavMatchs] = useState<FavMatch[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/compte');
      return;
    }
    if (user) chargerDonnees();
  }, [user, loading]);

  const chargerDonnees = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    if (profile) setUsername(profile.username || '');

    const { data: equipes } = await supabase.from('favoris_equipes').select('*').eq('user_id', user.id);
    if (equipes) setFavEquipes(equipes);

    const { data: matchs } = await supabase.from('favoris_matchs').select('*').eq('user_id', user.id);
    if (matchs) setFavMatchs(matchs);

    setChargement(false);
  };

  const retirerEquipe = async (id: string) => {
    await supabase.from('favoris_equipes').delete().eq('id', id);
    setFavEquipes(favEquipes.filter(e => e.id !== id));
  };

  const retirerMatch = async (id: string) => {
    await supabase.from('favoris_matchs').delete().eq('id', id);
    setFavMatchs(favMatchs.filter(m => m.id !== id));
  };

  const deconnexion = async () => {
    await signOut();
    router.push('/');
  };

  if (loading || chargement) {
    return (
      <div style={{minHeight:'100vh',background:'#fff',fontFamily:'sans-serif'}}>
        <Header />
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'48px 24px'}}>
          <p style={{color:'#9ca3af'}}>Chargement…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  const matchsFavoris = favMatchs
    .map(fm => MATCHES.find(m => m.id === fm.match_id))
    .filter(Boolean);

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'800px',margin:'0 auto',padding:'48px 24px'}}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontWeight:900,fontSize:'32px',margin:'0 0 4px'}}>
              Salut, {username || 'champion'} 👋
            </h1>
            <p style={{color:'#6b7280',fontSize:'14px',margin:0}}>{user.email}</p>
          </div>
          <button onClick={deconnexion} style={{
            padding:'10px 20px', borderRadius:'999px', border:'2px solid #ef4444',
            background:'#fff', color:'#ef4444', fontWeight:700, fontSize:'14px', cursor:'pointer'
          }}>
            Déconnexion
          </button>
        </div>

        <section style={{marginBottom:'40px'}}>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
            ⭐ Mes équipes favorites
          </h2>
          {favEquipes.length === 0 ? (
            <div style={{background:'#f9fafb',borderRadius:'16px',padding:'24px',textAlign:'center'}}>
              <p style={{color:'#6b7280',margin:0,fontSize:'14px'}}>
                Aucune équipe favorite. Ajoutez-en depuis la page d&apos;accueil.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
              {favEquipes.map(e => (
                <div key={e.id} style={{
                  display:'flex', alignItems:'center', gap:'8px',
                  background:'#faf5ff', border:'1px solid '+VIOLET, borderRadius:'999px',
                  padding:'8px 16px'
                }}>
                  <span style={{fontWeight:700,fontSize:'14px',color:'#111'}}>{e.equipe}</span>
                  <button onClick={() => retirerEquipe(e.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'18px',lineHeight:1}}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{fontWeight:900,fontSize:'22px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
            📅 Mes matchs suivis
          </h2>
          {matchsFavoris.length === 0 ? (
            <div style={{background:'#f9fafb',borderRadius:'16px',padding:'24px',textAlign:'center'}}>
              <p style={{color:'#6b7280',margin:0,fontSize:'14px'}}>
                Aucun match suivi. Ajoutez-en depuis la page d&apos;accueil.
              </p>
            </div>
          ) : (
            matchsFavoris.map(m => m && (
              <div key={m.id} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                border:'1px solid #e5e7eb', borderRadius:'12px', padding:'16px', marginBottom:'10px'
              }}>
                <div>
                  <p style={{fontWeight:700,margin:'0 0 4px',fontSize:'15px'}}>{m.home} vs {m.away}</p>
                  <p style={{color:'#6b7280',fontSize:'13px',margin:0}}>{m.day} {m.date} · {m.time} · {m.city}</p>
                </div>
                <button onClick={() => {
                  const fav = favMatchs.find(fm => fm.match_id === m.id);
                  if (fav) retirerMatch(fav.id);
                }} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'22px'}}>×</button>
              </div>
            ))
          )}
        </section>

      </main>
      <Footer />
    </div>
  );
}