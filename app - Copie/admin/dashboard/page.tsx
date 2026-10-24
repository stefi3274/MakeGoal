'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

export default function AdminDashboard() {
  const [connecte, setConnecte] = useState(false);
  const [stats, setStats] = useState({
    articles: 0, articlesPublies: 0,
    matchs: 0, votesMatchs: 0,
    concours: 0, participants: 0,
    membres: 0, newsletter: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) { setConnecte(true); chargerStats(); } else { setLoading(false); } }); }, []);

  const chargerStats = async () => {
    const [articles, matchs, votesM, concours, participations, profiles, newsletter] = await Promise.all([
      supabase.from('articles').select('id, publie'),
      supabase.from('matchs').select('id'),
      supabase.from('votes_communaute').select('id'),
      supabase.from('concours').select('id'),
      supabase.from('participations_matchs').select('user_id'),
      supabase.from('profiles').select('id'),
      supabase.from('newsletter').select('id'),
    ]);

    const participantsUniques = new Set((participations.data || []).map(p => p.user_id)).size;

    setStats({
      articles: articles.data?.length || 0,
      articlesPublies: articles.data?.filter(a => a.publie).length || 0,
      matchs: matchs.data?.length || 0,
      votesMatchs: votesM.data?.length || 0,
      concours: concours.data?.length || 0,
      participants: participantsUniques,
      membres: profiles.data?.length || 0,
      newsletter: newsletter.data?.length || 0,
    });
    setLoading(false);
  };

  if (!connecte && !loading) {
    return (
      <div style={{minHeight:'100vh',background:'#0f0f0f',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{textAlign:'center'}}>
          <p style={{color:'#9ca3af',marginBottom:'16px'}}>Vous devez être connecté.</p>
          <a href="/admin" style={{color:VIOLET,fontWeight:700}}>← Aller à l'admin</a>
        </div>
      </div>
    );
  }

  const cartes = [
    { label: 'Membres inscrits', value: stats.membres, emoji: '👥', couleur: '#7c3aed' },
    { label: 'Articles publiés', value: stats.articlesPublies, emoji: '📰', couleur: '#3b82f6' },
    { label: 'Matchs créés', value: stats.matchs, emoji: '⚽', couleur: '#10b981' },
    { label: 'Votes communauté', value: stats.votesMatchs, emoji: '🗳️', couleur: '#06b6d4' },
    { label: 'Concours', value: stats.concours, emoji: '🏆', couleur: '#f59e0b' },
    { label: 'Participants concours', value: stats.participants, emoji: '🎯', couleur: '#ec4899' },
    { label: 'Newsletter', value: stats.newsletter, emoji: '📬', couleur: '#8b5cf6' },
    { label: 'Total articles', value: stats.articles, emoji: '📄', couleur: '#64748b' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>📊 Tableau de bord</h1>
        <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
      </header>

      <main style={{maxWidth:'900px',margin:'0 auto',padding:'40px 24px'}}>
        <h2 style={{color:'#fff',fontWeight:900,fontSize:'26px',marginBottom:'32px'}}>Vue d'ensemble</h2>

        {loading ? (
          <p style={{color:'#9ca3af'}}>Chargement…</p>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'20px'}}>
            {cartes.map(c => (
              <div key={c.label} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'16px',padding:'28px 24px',borderLeft:'4px solid '+c.couleur}}>
                <div style={{fontSize:'32px',marginBottom:'12px'}}>{c.emoji}</div>
                <div style={{color:'#fff',fontSize:'40px',fontWeight:900,lineHeight:1}}>{c.value}</div>
                <div style={{color:'#9ca3af',fontSize:'13px',marginTop:'8px'}}>{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
