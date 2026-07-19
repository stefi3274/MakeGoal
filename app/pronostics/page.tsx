'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Pronostics() {
  const router = useRouter();
  useEffect(() => { router.replace('/matchs'); }, [router]);
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',background:'#fff'}}>
      <p style={{color:'#9ca3af'}}>Redirection…</p>
    </div>
  );
}