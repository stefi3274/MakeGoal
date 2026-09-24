'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../../lib/sport';
import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';
const NB_QUESTIONS = 10;
const DUREE_HEURES = 24;

type OptionQ = { cle: string; texte: string };
type QuestionForm = { question: string; options: OptionQ[]; bonne_reponse: string };

type Quizz = {
  id: string;
  titre: string;
  sport: string | null;
  statut: string;
  date_fermeture: string;
  created_at: string;
};

type Resultat = { nom: string; score: number; pourcentage: number; termine: boolean; gagnant: boolean };

const questionVide = (): QuestionForm => ({
  question: '', bonne_reponse: 'A',
  options: [{ cle: 'A', texte: '' }, { cle: 'B', texte: '' }, { cle: 'C', texte: '' }, { cle: 'D', texte: '' }]
});

export default function AdminQuizzFoot() {
  const [connecte, setConnecte] = useState(false);
  const [quizzes, setQuizzes] = useState<Quizz[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');
  const [sportForm, setSportForm] = useState<Sport>('football');

  const [titre, setTitre] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>(Array.from({ length: NB_QUESTIONS }, questionVide));
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [tirageEnCours, setTirageEnCours] = useState('');
  const [resultatsOuverts, setResultatsOuverts] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Record<string, Resultat[]>>({});
  const [texteColleOuvert, setTexteColleOuvert] = useState(false);
  const [texteColle, setTexteColle] = useState('');

  useEffect(() => { setSportForm(getSport()); }, []);
  useEffect(() => { if (connecte) chargerQuizzes(); }, [connecte]);

  const chargerQuizzes = async () => {
    const { data } = await supabase.from('quizz_foot').select('id, titre, sport, statut, date_fermeture, created_at').order('created_at', { ascending: false });
    if (data) setQuizzes(data);
  };

  const modifierQuestion = (i: number, champ: 'question' | 'bonne_reponse', val: string) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [champ]: val } : q));
  const modifierOption = (i: number, o: number, val: string) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, options: q.options.map((opt, oi) => oi === o ? { ...opt, texte: val } : opt) } : q));

  // Format à coller : un bloc par question (séparé par une ligne vide),
  // 1re ligne = la question, puis 2 à 4 lignes "A. ...", "B. ...", et une
  // ligne "Réponse: X" (ou "Bonne réponse: X") avec la lettre correcte.
  const parserQuestionsQuizz = (texte: string): QuestionForm[] => {
    const blocs = texte.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    return blocs.map(bloc => {
      const lignes = bloc.split('\n').map(l => l.trim()).filter(Boolean);
      const question = lignes[0] || '';
      const options: OptionQ[] = [];
      let bonne_reponse = 'A';
      lignes.slice(1).forEach(l => {
        const mRep = l.match(/^(?:r[ée]ponse|bonne r[ée]ponse)\s*[:\-]?\s*([A-Da-d])\s*$/i);
        const mOpt = !mRep && l.match(/^([A-Da-d])\s*[.\-:\)]\s*(.+)$/);
        if (mRep) bonne_reponse = mRep[1].toUpperCase();
        else if (mOpt) options.push({ cle: mOpt[1].toUpperCase(), texte: mOpt[2].trim() });
      });
      while (options.length < 4) options.push({ cle: String.fromCharCode(65 + options.length), texte: '' });
      return { question, options: options.slice(0, 4), bonne_reponse };
    });
  };

  const analyserQuestions = () => {
    if (!texteColle.trim()) { setMessage('❌ Collez du texte à analyser.'); return; }
    const parsees = parserQuestionsQuizz(texteColle);
    const completees = Array.from({ length: NB_QUESTIONS }, (_, i) => parsees[i] || questionVide());
    setQuestions(completees.slice(0, NB_QUESTIONS));
    const valides = parsees.filter(q => q.question && q.options.filter(o => o.texte).length >= 2).length;
    if (parsees.length !== NB_QUESTIONS) {
      setMessage('⚠️ ' + parsees.length + ' question(s) détectée(s) au lieu de ' + NB_QUESTIONS + ' (dont ' + valides + ' complète(s)). Vérifiez et complétez ci-dessous avant de publier.');
    } else {
      setMessage('✅ ' + NB_QUESTIONS + ' questions analysées (dont ' + valides + ' complète(s)). Vérifiez et corrigez si besoin avant de publier.');
    }
  };

  const creerQuizz = async () => {
    if (!titre.trim()) { setMessage('❌ Le titre est obligatoire.'); return; }
    const incompletes = questions.filter(q => !q.question.trim() || q.options.filter(o => o.texte.trim()).length < 2);
    if (incompletes.length > 0) { setMessage('❌ Les ' + NB_QUESTIONS + ' questions doivent avoir un texte et au moins 2 options.'); return; }
    setCreationEnCours(true);
    const questionsAEnregistrer = questions.map((q, i) => ({
      id: 'q' + (i + 1),
      question: q.question,
      options: q.options.filter(o => o.texte.trim()),
      bonne_reponse: q.bonne_reponse
    }));
    const { error } = await supabase.from('quizz_foot').insert({
      titre, sport: sportForm, questions: questionsAEnregistrer, statut: 'ouvert',
      date_fermeture: new Date(Date.now() + DUREE_HEURES * 3600 * 1000).toISOString()
    });
    setCreationEnCours(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ FootQuizz publié !');
    setTitre(''); setQuestions(Array.from({ length: NB_QUESTIONS }, questionVide));
    setTexteColle(''); setTexteColleOuvert(false);
    chargerQuizzes();
    setTimeout(() => setVue('liste'), 1200);
  };

  const declencherTirage = async (quizzId: string) => {
    if (!confirm('Fermer ce FootQuizz et tirer au sort les gagnants maintenant ? Cette action est définitive.')) return;
    setTirageEnCours(quizzId);
    setMessage('⏳ Tirage en cours...');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setTirageEnCours(''); setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/quizz-foot-tirage', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ quizzId })
    });
    const data = await res.json();
    setTirageEnCours('');
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    setMessage('✅ Tirage effectué : ' + data.nombreGagnants + ' gagnant(s) ont reçu 30 points.');
    chargerQuizzes();
  };

  const voirResultats = async (quizzId: string) => {
    if (resultatsOuverts === quizzId) { setResultatsOuverts(null); return; }
    setResultatsOuverts(quizzId);
    if (resultats[quizzId]) return;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/quizz-foot-resultats?quizzId=' + quizzId, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    if (res.ok) setResultats(prev => ({ ...prev, [quizzId]: data.resultats }));
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#9ca3af', display: 'block' as const, marginBottom: '6px' };

  if (!connecte) {
    return <AdminAuth titre="Admin FootQuizz" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#111', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: VIOLET, fontWeight: 900, fontSize: '18px', margin: 0 }}>🧠 FootQuizz</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/admin" style={{ background: '#333', color: '#fff', textDecoration: 'none', padding: '10px 16px', borderRadius: '999px', fontWeight: 700, fontSize: '14px' }}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{ background: vue === 'liste' ? VIOLET : '#333', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '999px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Liste</button>
          <button onClick={() => setVue('nouveau')} style={{ background: vue === 'nouveau' ? VIOLET : '#333', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '999px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{ padding: '12px 24px', background: message.includes('❌') ? '#7f1d1d' : '#064e3b', color: message.includes('❌') ? '#fca5a5' : '#6ee7b7', fontWeight: 700, fontSize: '14px' }}>{message}</div>}

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>

        {vue === 'nouveau' && (
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '20px', marginBottom: '8px' }}>Nouveau FootQuizz</h2>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 20px' }}>{NB_QUESTIONS} questions, 10 secondes par question, actif {DUREE_HEURES}h, une seule tentative par utilisateur. Le tirage au sort parmi les ≥80% se fait manuellement, ici même.</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['football', 'basketball'] as Sport[]).map(s => (
                <button key={s} type="button" onClick={() => setSportForm(s)} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: sportForm === s ? SPORT_COULEURS[s].primaire : '#333', color: '#fff' }}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Titre du quizz</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="FootQuizz de la semaine" style={inputStyle} />
            </div>

            <button type="button" onClick={() => setTexteColleOuvert(v => !v)} style={{ padding: '10px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: texteColleOuvert ? '#333' : VIOLET, color: '#fff', marginBottom: '16px' }}>{texteColleOuvert ? '✕ Fermer' : '📋 Coller les 10 questions'}</button>

            {texteColleOuvert && (
              <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>Un bloc par question, séparé par une ligne vide. Questions courtes, réponse simple : la question, puis les options (A à D), puis "Réponse: X".</p>
                <textarea value={texteColle} onChange={e => setTexteColle(e.target.value)} rows={14} placeholder={"Qui a remporté le Ballon d'or 2025 ?\nA. Mbappé\nB. Vinicius\nC. Dembélé\nD. Yamal\nRéponse: C\n\nCombien de Ballons d'or Messi a-t-il gagnés ?\nA. 6\nB. 7\nC. 8\nD. 9\nRéponse: C"} style={{ ...inputStyle, marginBottom: '10px', fontFamily: 'monospace', fontSize: '13px' }} />
                <button type="button" onClick={analyserQuestions} style={{ padding: '10px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: VIOLET, color: '#fff' }}>🔍 Analyser et remplir les {NB_QUESTIONS} questions</button>
              </div>
            )}

            {questions.map((q, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                <p style={{ color: VIOLET, fontWeight: 900, fontSize: '12px', margin: '0 0 10px' }}>Question {i + 1} / {NB_QUESTIONS}</p>
                <textarea value={q.question} onChange={e => modifierQuestion(i, 'question', e.target.value)} rows={2} placeholder="Texte de la question" style={{ ...inputStyle, resize: 'vertical', marginBottom: '10px' }} />
                {q.options.map((o, oi) => (
                  <div key={o.cle} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <span style={{ width: '20px', color: '#9ca3af', fontWeight: 900, fontSize: '13px' }}>{o.cle}</span>
                    <input value={o.texte} onChange={e => modifierOption(i, oi, e.target.value)} placeholder={'Option ' + o.cle} style={inputStyle} />
                    <input type="radio" name={'bonneReponse' + i} checked={q.bonne_reponse === o.cle} onChange={() => modifierQuestion(i, 'bonne_reponse', o.cle)} title="Bonne réponse" style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ))}

            <button onClick={creerQuizz} disabled={creationEnCours} style={{ width: '100%', padding: '14px', background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>{creationEnCours ? '⏳...' : '🧠 Publier le FootQuizz'}</button>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {quizzes.length === 0 && <p style={{ color: '#6b7280' }}>Aucun FootQuizz pour le moment.</p>}
            {quizzes.map(q => (
              <div key={q.id} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: 700, background: q.statut === 'ouvert' ? '#10b981' : q.statut === 'ferme' ? '#f59e0b' : '#6b7280', color: '#fff' }}>
                      {q.statut === 'ouvert' ? '🟢 Ouvert' : q.statut === 'ferme' ? '🟡 Fermé' : '✓ Tiré'}
                    </span>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: '8px 0 4px' }}>{q.titre}</p>
                    {q.statut === 'ouvert' && <p style={{ color: VIOLET, fontSize: '11px', margin: '4px 0 0', fontWeight: 700 }}>⏱️ Ferme le {new Date(q.date_fermeture).toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {q.statut !== 'tire' && (
                    <button onClick={() => declencherTirage(q.id)} disabled={tirageEnCours === q.id} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', background: VIOLET, color: '#fff' }}>{tirageEnCours === q.id ? '⏳...' : '🎲 Clôturer et tirer au sort'}</button>
                  )}
                  <button onClick={() => voirResultats(q.id)} style={{ padding: '8px 16px', borderRadius: '999px', border: '1px solid #333', cursor: 'pointer', fontWeight: 700, fontSize: '12px', background: 'transparent', color: '#9ca3af' }}>{resultatsOuverts === q.id ? '▲ Masquer les résultats' : '▼ Voir les résultats (privé)'}</button>
                </div>
                {resultatsOuverts === q.id && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid #2a2a2a', paddingTop: '14px' }}>
                    {!resultats[q.id] && <p style={{ color: '#6b7280', fontSize: '13px' }}>Chargement...</p>}
                    {resultats[q.id] && resultats[q.id].length === 0 && <p style={{ color: '#6b7280', fontSize: '13px' }}>Aucun participant pour le moment.</p>}
                    {resultats[q.id] && resultats[q.id].map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #222', fontSize: '13px' }}>
                        <span style={{ color: r.gagnant ? '#eab308' : '#fff' }}>{r.gagnant ? '🏆 ' : ''}{r.nom}</span>
                        <span style={{ color: r.pourcentage >= 80 ? '#10b981' : '#6b7280', fontWeight: 700 }}>{r.termine ? r.score + '/10 (' + r.pourcentage + '%)' : 'en cours'}</span>
                      </div>
                    ))}
                    <p style={{ color: '#6b7280', fontSize: '11px', margin: '10px 0 0' }}>Cette liste n'est jamais visible sur le site. Utilisez les noms et le score pour créer le post "Gagnants" dans Articles &amp; Média si vous le souhaitez.</p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
