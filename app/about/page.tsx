'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const VIOLET = '#bf00ff';

type Apropos = { photo_url: string | null; titre: string; texte: string | null; };

export default function About() {
  const [data, setData] = useState<Apropos | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    const { data } = await supabase.from('a_propos').select('*').eq('id', 1).single();
    if (data) setData(data);
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',padding:'48px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(28px,5vw,44px)',margin:0}}>
          {data?.titre || 'À propos de MakeGoal'}
        </h1>
      </div>

      <main style={{maxWidth:'720px',margin:'0 auto',padding:'48px 24px'}}>
        {loading ? (
          <p style={{color:'#9ca3af',textAlign:'center'}}>Chargement…</p>
        ) : (
          <>
            {data?.photo_url && (
              <div style={{textAlign:'center',marginBottom:'32px'}}>
                <img src={data.photo_url} alt="Photo de profil" style={{width:'160px',height:'160px',objectFit:'cover',borderRadius:'50%',border:'4px solid '+VIOLET,boxShadow:'0 4px 20px rgba(191,0,255,0.3)'}}/>
              </div>
            )}
            <div style={{fontSize:'17px',lineHeight:'1.9',color:'#374151',whiteSpace:'pre-wrap'}}>
              {data?.texte || 'MakeGoal est un média de relai sportif.'}
            </div>

            <div style={{marginTop:'40px',padding:'24px',background:'#faf5ff',borderRadius:'16px',textAlign:'center',border:'1px solid '+VIOLET}}>
              <p style={{color:'#374151',fontSize:'15px',margin:'0 0 16px',fontWeight:600}}>Rejoignez la communauté MakeGoal</p>
              <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
                <a href="/" style={{background:VIOLET,color:'#fff',padding:'12px 24px',borderRadius:'999px',fontWeight:700,fontSize:'14px',textDecoration:'none'}}>📰 Le média</a>
                <a href="/concours" style={{background:'#ffd700',color:'#3d2c00',padding:'12px 24px',borderRadius:'999px',fontWeight:700,fontSize:'14px',textDecoration:'none'}}>🏆 Le concours</a>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
