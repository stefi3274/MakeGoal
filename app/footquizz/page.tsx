'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getSport, Sport } from '../../lib/sport';

const COULEUR = '#bf00ff';
const DUREE_QUESTION_MS = 60 * 1000;

type Quizz = { id: string; titre: string; sport: string | null; statut: string; date_fermeture: string; created_at: string };
type Participation = { termine: boolean; score: number | null; pourcentage: number | null };
type QuestionJeu = { id: string; question: string; options: { cle: string; texte: string }[] };

const formatChrono = (ms: number) => {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

export default function FootQuizzPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sport, setSportLocal] = useState<Sport>('football');
  const [quizzes, setQuizzes] = useState<Quizz[]>([]);
  const [participations, setParticipations] = useState<Record<string, Participation>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [maintenant, setMaintenant] = useState(Date.now());
  const declencheursEnvoyes = useRef<Set<string>>(new Set());

  // État du quizz en cours de jeu
  const [enJeu, setEnJeu] = useState<{ quizzId: string; questions: QuestionJeu[] } | null>(null);
  const [indexQuestion, setIndexQuestion] = useState(0);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [finQuestionA, setFinQuestionA] = useState(0);
  const [demarrageEnCours, setDemarrageEnCours] = useState('');
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const [resultatFinal, setResultatFinal] = useState<{ score: number; total: number; pourcentage: number; eligible: boolean } | null>(null);

  useEffect(() => { setSportLocal(getSport()); }, []);
  useEffect(() => { charger(); }, [sport]);
  useEffect(() => { const t = setInterval(() => setMaintenant(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    quizzes.forEach(q => {
      if (q.statut === 'ouvert' && q.date_fermeture) {
        const reste = new Date(q.date_fermeture).getTime() - maintenant;
        if (reste <= 0 && !declencheursEnvoyes.current.has(q.id)) {
          declencheursEnvoyes.current.add(q.id);
          fetch('/api/quizz-foot-tirage-auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizzId: q.id }) }).then(charger);
        }
      }
    });
  }, [maintenant, quizzes]);

  const charger = async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch('/api/quizz-foot-liste?sport=' + sport, { headers: token ? { 'Authorization': 'Bearer ' + token } : {} });
    const data = await res.json();
    if (res.ok) { setQuizzes(data.quizzes); setParticipations(data.participations || {}); }
    setLoading(false);
  };

  const commencer = async (quizzId: string) => {
    if (!user) { router.push('/compte'); return; }
    setDemarrageEnCours(quizzId); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setDemarrageEnCours(''); setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/quizz-foot-commencer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ quizzId })
    });
    const data = await res.json();
    setDemarrageEnCours('');
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setEnJeu({ quizzId, questions: data.questions });
    setIndexQuestion(0);
    setReponses({});
    setResultatFinal(null);
    setFinQuestionA(Date.now() + DUREE_QUESTION_MS);
  };

  const choisir = (questionId: string, cle: string) => {
    setReponses(prev => ({ ...prev, [questionId]: cle }));
  };

  const questionSuivante = useCallback(() => {
    if (!enJeu) return;
    if (indexQuestion + 1 < enJeu.questions.length) {
      setIndexQuestion(i => i + 1);
      setFinQuestionA(Date.now() + DUREE_QUESTION_MS);
    } else {
      soumettre();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enJeu, indexQuestion, reponses]);

  // Chrono de la question en cours : passage auto à la suivante à zéro
  useEffect(() => {
    if (!enJeu || resultatFinal) return;
    const t = setInterval(() => {
      if (Date.now() >= finQuestionA) questionSuivante();
    }, 250);
    return () => clearInterval(t);
  }, [enJeu, finQuestionA, resultatFinal, questionSuivante]);

  const soumettre = async () => {
    if (!enJeu || soumissionEnCours) return;
    setSoumissionEnCours(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setSoumissionEnCours(false); setMessage('❌ Session expirée.'); return; }
    const res = await fetch('/api/quizz-foot-soumettre', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ quizzId: enJeu.quizzId, reponses })
    });
    const data = await res.json();
    setSoumissionEnCours(false);
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); setEnJeu(null); return; }
    setResultatFinal({ score: data.score, total: data.total, pourcentage: data.pourcentage, eligible: data.eligible });
    charger();
  };

  const fermerResultat = () => { setEnJeu(null); setResultatFinal(null); };

  const resteQuestion = enJeu && !resultatFinal ? finQuestionA - maintenant : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111', fontFamily: 'sans-serif' }}>
      <Header />

      <div style={{ background: 'linear-gradient(135deg,#3b0764,' + COULEUR + ')', padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(26px,5vw,40px)', margin: '0 0 8px' }}>🧠 FootQuizz</h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', margin: 0 }}>10 questions, 1 minute chacune, une seule tentative. ≥80% de bonnes réponses = éligible au tirage au sort.</p>
      </div>

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 16px' }}>
        {message && <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, fontSize: '14px', background: '#fef2f2', color: '#ef4444' }}>{message}</div>}

        {/* Écran de jeu */}
        {enJeu && !resultatFinal && (() => {
          const q = enJeu.questions[indexQuestion];
          const choix = reponses[q.id];
          return (
            <div style={{ border: '2px solid #e9d5ff', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 900, fontSize: '13px', color: COULEUR }}>Question {indexQuestion + 1} / {enJeu.questions.length}</span>
                <div style={{ textAlign: 'center', background: '#3b0764', color: '#fff', borderRadius: '12px', padding: '6px 12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace' }}>{formatChrono(Math.max(0, resteQuestion))}</div>
                </div>
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '19px', margin: '0 0 16px' }}>{q.question}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {q.options.map(o => (
                  <button key={o.cle} onClick={() => choisir(q.id, o.cle)} style={{
                    textAlign: 'left', padding: '14px 18px', borderRadius: '12px', cursor: 'pointer',
                    border: '2px solid ' + (choix === o.cle ? COULEUR : '#e5e7eb'), background: choix === o.cle ? '#faf5ff' : '#fff', fontWeight: 700, fontSize: '14px', color: '#374151'
                  }}>
                    <span style={{ color: COULEUR, fontWeight: 900, marginRight: '8px' }}>{o.cle}.</span>{o.texte}
                  </button>
                ))}
              </div>
              <button onClick={questionSuivante} disabled={soumissionEnCours} style={{ width: '100%', padding: '14px', background: COULEUR, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                {soumissionEnCours ? '⏳...' : indexQuestion + 1 < enJeu.questions.length ? 'Question suivante →' : 'Terminer le quizz ✓'}
              </button>
            </div>
          );
        })()}

        {/* Résultat perso (jamais les gagnants, seulement son propre score) */}
        {resultatFinal && (
          <div style={{ border: '2px solid #e9d5ff', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' }}>Votre résultat</p>
            <p style={{ fontSize: '48px', fontWeight: 900, color: COULEUR, margin: '0 0 8px' }}>{resultatFinal.score}/{resultatFinal.total}</p>
            <p style={{ fontSize: '16px', color: '#374151', margin: '0 0 16px' }}>{resultatFinal.pourcentage}% de bonnes réponses</p>
            {resultatFinal.eligible ? (
              <p style={{ background: '#f0fdf4', color: '#065f46', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}>✅ Vous êtes éligible au tirage au sort ! Rendez-vous sur votre profil pour voir si vous avez gagné.</p>
            ) : (
              <p style={{ background: '#f9fafb', color: '#6b7280', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}>Il fallait au moins 80% pour être éligible au tirage. Retentez au prochain FootQuizz !</p>
            )}
            <button onClick={fermerResultat} style={{ marginTop: '20px', padding: '12px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Retour</button>
          </div>
        )}

        {/* Liste des quizz */}
        {!enJeu && !resultatFinal && (
          <>
            {loading && <p style={{ color: '#9ca3af', textAlign: 'center' }}>Chargement…</p>}
            {!loading && quizzes.length === 0 && (
              <div style={{ background: '#f9fafb', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280', margin: 0 }}>Aucun FootQuizz pour le moment. Revenez bientôt !</p>
              </div>
            )}
            {quizzes.map(q => {
              const part = participations[q.id];
              const reste = q.date_fermeture ? new Date(q.date_fermeture).getTime() - maintenant : null;
              const encoreOuvert = q.statut === 'ouvert' && (reste === null || reste > 0);
              return (
                <div key={q.id} style={{ border: '2px solid ' + (encoreOuvert ? '#e9d5ff' : '#e5e7eb'), borderRadius: '20px', padding: '24px', marginBottom: '20px', opacity: encoreOuvert ? 1 : 0.9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <h2 style={{ fontWeight: 900, fontSize: '19px', margin: 0 }}>{q.titre}</h2>
                    {encoreOuvert && reste !== null && (
                      <div style={{ flexShrink: 0, textAlign: 'center', background: '#3b0764', color: '#fff', borderRadius: '12px', padding: '8px 12px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Temps restant</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace' }}>{formatChrono(reste)}</div>
                      </div>
                    )}
                  </div>

                  {!encoreOuvert && !part?.termine && (
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Ce FootQuizz est terminé.</p>
                  )}

                  {part?.termine ? (
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#374151' }}>Vous avez déjà fait ce FootQuizz : {part.score}/10 ({part.pourcentage}%)</p>
                    </div>
                  ) : encoreOuvert ? (
                    <button onClick={() => commencer(q.id)} disabled={demarrageEnCours === q.id} style={{ width: '100%', padding: '14px', background: COULEUR, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                      {demarrageEnCours === q.id ? '⏳...' : '🧠 Commencer le FootQuizz'}
                    </button>
                  ) : null}
                  {encoreOuvert && !part?.termine && !user && <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>Connectez-vous pour jouer.</p>}
                </div>
              );
            })}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
