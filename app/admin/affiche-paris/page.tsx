'use client';
import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type MatchLigne = { id: number; equipe1: string; equipe2: string };

export default function AdminAfficheParis() {
  const [connecte, setConnecte] = useState(false);
  const [matchs, setMatchs] = useState<MatchLigne[]>([
    { id: 1, equipe1: '', equipe2: '' }
  ]);
  const [telechargement, setTelechargement] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const ajouterMatch = () => {
    if (matchs.length >= 8) return;
    setMatchs(prev => [...prev, { id: Date.now(), equipe1: '', equipe2: '' }]);
  };
  const retirerMatch = (id: number) => setMatchs(prev => prev.length > 1 ? prev.filter(m => m.id !== id) : prev);
  const modifierMatch = (id: number, champ: 'equipe1' | 'equipe2', valeur: string) =>
    setMatchs(prev => prev.map(m => m.id === id ? { ...m, [champ]: valeur } : m));

  const matchsRemplis = matchs.filter(m => m.equipe1.trim() && m.equipe2.trim());

  // Ajuste la taille du texte des matchs selon leur nombre, pour que
  // l'affiche reste lisible et équilibrée peu importe combien il y en a.
  const tailleMatch = matchsRemplis.length <= 2 ? 34 : matchsRemplis.length <= 4 ? 27 : matchsRemplis.length <= 6 ? 22 : 18;
  const espaceMatch = matchsRemplis.length <= 4 ? 16 : 10;

  const telecharger = async () => {
    if (!cardRef.current || matchsRemplis.length === 0) return;
    setTelechargement(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#1a0033', useCORS: true });
      const link = document.createElement('a');
      link.download = 'makegoal-parye-san-lajan.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('Erreur lors du téléchargement. Réessayez.');
    }
    setTelechargement(false);
  };

  if (!connecte) {
    return <AdminAuth titre="Admin Affiche Paris" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{minHeight:'100vh',background:'#111',fontFamily:'sans-serif'}}>
      <header style={{background:'#1a1a1a',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #333',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>🎲 Affiche Parye San Lajan</h1>
        <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
      </header>

      <main style={{maxWidth:'1000px',margin:'0 auto',padding:'32px 16px',display:'grid',gridTemplateColumns:'1fr',gap:'32px'}}>

        <div>
          <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'16px'}}>
            Cette affiche est uniquement téléchargeable — elle n'apparaît jamais sur le site. Ajoute les matchs à mettre en avant (1 à 8), puis télécharge l'image en 1080×1080 pour la publier toi-même sur les réseaux.
          </p>

          {matchs.map((m, i) => (
            <div key={m.id} style={{display:'flex',gap:'8px',marginBottom:'10px',alignItems:'center'}}>
              <span style={{color:'#6b7280',fontSize:'12px',width:'20px'}}>{i+1}.</span>
              <input value={m.equipe1} onChange={e => modifierMatch(m.id, 'equipe1', e.target.value)} placeholder="Équipe 1" style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px'}}/>
              <span style={{color:'#6b7280',fontSize:'12px'}}>vs</span>
              <input value={m.equipe2} onChange={e => modifierMatch(m.id, 'equipe2', e.target.value)} placeholder="Équipe 2" style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px'}}/>
              <button onClick={() => retirerMatch(m.id)} disabled={matchs.length===1} style={{background:'none',border:'none',color:'#ef4444',fontSize:'18px',cursor:matchs.length===1?'default':'pointer',opacity:matchs.length===1?0.3:1}}>✕</button>
            </div>
          ))}

          <div style={{display:'flex',gap:'10px',marginTop:'12px'}}>
            <button onClick={ajouterMatch} disabled={matchs.length>=8} style={{background:'#333',color:'#fff',border:'none',padding:'10px 18px',borderRadius:'999px',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>+ Ajouter un match</button>
          </div>

          <button onClick={telecharger} disabled={telechargement || matchsRemplis.length===0} style={{width:'100%',marginTop:'24px',padding:'16px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'12px',border:'none',cursor:'pointer',fontSize:'15px'}}>
            {telechargement ? '⏳ Génération...' : '⬇️ Télécharger l\'affiche (1080×1080)'}
          </button>
        </div>

        <div style={{display:'flex',justifyContent:'center'}}>
          <div ref={cardRef} style={{
            width:'540px', height:'540px', position:'relative', overflow:'hidden',
            fontFamily:'sans-serif',
            background: 'radial-gradient(circle at 18% 12%, rgba(255,215,0,0.16), transparent 42%), radial-gradient(circle at 85% 88%, rgba(255,255,255,0.10), transparent 45%), linear-gradient(155deg, #1a0033 0%, #4b0e8f 42%, #bf00ff 100%)'
          }}>
            <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',backgroundSize:'27px 27px',maskImage:'radial-gradient(circle at 50% 38%, black 0%, transparent 72%)'}}/>

            <div style={{position:'absolute',top:'28px',left:'28px',display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'30px',height:'30px',borderRadius:'8px',background:'linear-gradient(135deg,#ffffff,#ffe58a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px'}}>⚽</div>
              <span style={{color:'#fff',fontWeight:900,fontSize:'16px'}}>MakeGoal</span>
            </div>
            <div style={{position:'absolute',top:'24px',right:'28px',fontSize:'32px',transform:'rotate(-8deg)'}}>🎲</div>

            <div style={{position:'absolute',top:'90px',left:0,right:0,textAlign:'center',padding:'0 40px'}}>
              <p style={{color:'#ffe58a',fontWeight:800,fontSize:'19px',margin:'0 0 4px'}}>OBTENEZ 1 000 GOURDES</p>
              <p style={{color:'#fff',fontWeight:900,fontSize:'22px',margin:0}}>et pariez sur :</p>
            </div>

            <div style={{position:'absolute',top:'175px',left:0,right:0,bottom:'150px',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:espaceMatch+'px',padding:'0 36px'}}>
              {matchsRemplis.map((m, i) => (
                <div key={m.id} style={{
                  background:'rgba(255,255,255,0.13)', border:'1.5px solid rgba(255,255,255,0.3)',
                  borderRadius:'999px', padding: (tailleMatch>=30?'10px 26px':'7px 20px'), width:'100%', maxWidth:'460px', textAlign:'center'
                }}>
                  <span style={{color:'#fff',fontWeight:800,fontSize:tailleMatch+'px'}}>{m.equipe1}</span>
                  <span style={{color:'#ffd700',fontWeight:700,fontSize:(tailleMatch-8)+'px',margin:'0 10px'}}>vs</span>
                  <span style={{color:'#fff',fontWeight:800,fontSize:tailleMatch+'px'}}>{m.equipe2}</span>
                </div>
              ))}
              {matchsRemplis.length === 0 && (
                <p style={{color:'rgba(255,255,255,0.5)',fontSize:'16px'}}>Ajoute des matchs à gauche…</p>
              )}
            </div>

            <div style={{position:'absolute',bottom:'86px',left:0,right:0,textAlign:'center'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.14)',border:'1.5px solid rgba(255,255,255,0.35)',borderRadius:'999px',padding:'9px 22px'}}>
                <span style={{width:'8px',height:'8px',borderRadius:'999px',background:'#ffd700'}}/>
                <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>Jwe Gratis. Retire lajan w.</span>
              </div>
            </div>

            <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.28)',padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#fff',fontWeight:800,fontSize:'14px'}}>Aucun achat <span style={{color:'#ffd700'}}>nécessaire</span></span>
              <span style={{color:'rgba(255,255,255,0.85)',fontWeight:600,fontSize:'12px'}}>makegoal.vercel.app</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
