'use client';
import { useEffect, useRef } from 'react';

// Clé publique du site (visible par tous les visiteurs, sans danger). La clé secrète est dans Supabase.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAFdi1S3C2RdAmg2Y';

type ApiTurnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
const api = () => (window as unknown as { turnstile?: ApiTurnstile }).turnstile;

// Vérification anti-robot Cloudflare. onToken reçoit le jeton (à usage unique), ou null s'il expire.
// Pour redemander un jeton après usage, le parent change la prop `key` du composant.
export default function Turnstile({ onToken, theme = 'light' }: { onToken: (token: string | null) => void; theme?: 'light' | 'dark' }) {
  const boite = useRef<HTMLDivElement>(null);
  const rappel = useRef(onToken);
  rappel.current = onToken;

  useEffect(() => {
    let id: string | null = null;
    let arrete = false;
    if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    const essayer = (n: number) => {
      if (arrete) return;
      const t = api();
      if (t && boite.current) {
        id = t.render(boite.current, {
          sitekey: TURNSTILE_SITE_KEY, theme,
          callback: (jeton: string) => rappel.current(jeton),
          'expired-callback': () => rappel.current(null),
          'error-callback': () => rappel.current(null),
        });
      } else if (n < 100) setTimeout(() => essayer(n + 1), 100);
    };
    essayer(0);
    return () => { arrete = true; const t = api(); if (t && id) { try { t.remove(id); } catch { /* ignore */ } } };
  }, [theme]);

  return <div ref={boite} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }} />;
}
