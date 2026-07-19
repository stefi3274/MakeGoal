'use client';

const VIOLET = '#bf00ff';
const LOGO_URL = 'https://giflxfycfqanyfaeoedz.supabase.co/storage/v1/object/public/images/logo%20makegoal.jpg';

export default function Footer() {
  return (
    <footer style={{background:'#1a1a1a',color:'#e5e7eb',padding:'32px 16px',marginTop:'48px'}}>
      <div style={{maxWidth:'960px',margin:'0 auto'}}>
        <div style={{display:'flex',flexWrap:'wrap',gap:'24px',justifyContent:'space-between',marginBottom:'24px'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
              <img src={LOGO_URL} alt="MakeGoal" style={{height:'32px',borderRadius:'6px'}}/>
              <h4 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>MakeGoal</h4>
            </div>
            <p style={{fontSize:'13px',color:'#9ca3af',margin:0}}>Média sportif — N ap enfòme w.</p>
            <p style={{fontSize:'12px',color:'#9ca3af',marginTop:'8px'}}>Édité par SteFi Services<br/>Port-au-Prince, Haïti</p>
          </div>
          <div>
            <h4 style={{color:'#ffffff',fontWeight:700,fontSize:'14px',marginBottom:'8px'}}>Informations</h4>
            <ul style={{listStyle:'none',padding:0,margin:0,fontSize:'13px',lineHeight:'1.8'}}>
              <li><a href="/about" style={{color:'#e5e7eb',textDecoration:'none'}}>À propos</a></li>
              <li><a href="/matchs" style={{color:'#e5e7eb',textDecoration:'none'}}>Matchs</a></li>
              <li><a href="/concours" style={{color:'#e5e7eb',textDecoration:'none'}}>Concours</a></li>
              <li><a href="/mentions" style={{color:'#e5e7eb',textDecoration:'none'}}>Mentions légales</a></li>
              <li><a href="/confidentialite" style={{color:'#e5e7eb',textDecoration:'none'}}>Confidentialité</a></li>
              <li><a href="/jeu-responsable" style={{color:'#9ca3af',textDecoration:'none',fontSize:'12px'}}>Jeu responsable</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{color:'#ffffff',fontWeight:700,fontSize:'14px',marginBottom:'8px'}}>Contact</h4>
            <p style={{fontSize:'13px',color:'#e5e7eb',margin:0,lineHeight:'1.8'}}>
              stefi3274@gmail.com<br/>
              +509 55108873
            </p>
          </div>
        </div>
        <div style={{borderTop:'1px solid #374151',paddingTop:'16px',display:'flex',flexWrap:'wrap',gap:'12px',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontSize:'12px',color:'#9ca3af',margin:0}}>© 2026 SteFi Services — Tous droits réservés</p>
          <p style={{fontSize:'12px',color:VIOLET,fontWeight:700,margin:0}}>⚽ MakeGoal — N ap enfòme w</p>
        </div>
      </div>
    </footer>
  );
}