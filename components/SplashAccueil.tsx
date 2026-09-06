'use client';
import { useEffect, useState } from 'react';

const LOGO_URL = 'https://giflxfycfqanyfaeoedz.supabase.co/storage/v1/object/public/images/logo%20makegoal.jpg';

export default function SplashAccueil() {
  const [visible, setVisible] = useState(true);
  const [disparait, setDisparait] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDisparait(true), 1100);
    const t2 = setTimeout(() => setVisible(false), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#ffffff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: disparait ? 0 : 1, transition: 'opacity 0.4s ease-out',
      pointerEvents: disparait ? 'none' : 'auto'
    }}>
      <style>{`
        @keyframes splashEntree {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashPulse {
          0%, 100% { box-shadow: 0 8px 30px rgba(191,0,255,0.15); }
          50% { box-shadow: 0 8px 40px rgba(191,0,255,0.3); }
        }
        .splash-logo {
          animation: splashEntree 0.5s ease-out, splashPulse 1.6s ease-in-out infinite;
        }
      `}</style>
      <img src={LOGO_URL} alt="MakeGoal" className="splash-logo" style={{ height: '96px', borderRadius: '16px' }} />
      <p style={{ color: '#bf00ff', fontWeight: 900, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '18px', opacity: 0.85 }}>
        MakeGoal
      </p>
    </div>
  );
}
