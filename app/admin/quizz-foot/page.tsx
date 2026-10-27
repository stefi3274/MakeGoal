'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../../lib/sport';
import AdminAuth from '../../../components/AdminAuth';
import { separerHook, hookPublie, MAX_HOOK } from '../../../lib/hook';
import VideoModal from '../../../components/VideoModal';

const VIOLET = '#bf00ff';
const NB_QUESTIONS = 10;
import { TYPES_QUIZZ, TypeQuizz, typeDepuisDurees } from '../../../lib/quizzTypes';
import { Sponsor, SPONSOR_VIDE, MAX_SPONSORS, sponsorsPublies } from '../../../lib/promo';
import { redimensionnerImage } from '../../../lib/images';

type OptionQ = { cle: string; texte: string };
type QuestionForm = { question: string; options: OptionQ[]; bonne_reponse: string };

type Quizz = {
  id: string;
  titre: string;
  sport: string | null;
  statut: string;
  date_fermeture: string;
  created_at: string;
  sponsors?: Sponsor[] | null;
  hook?: string | null;
  questions?: { question: string; options: { cle: string; texte: string }[]; bonne_reponse?: string }[];
};

type Resultat = { nom: string; score: number; pourcentage: number; termine: boolean; gagnant: boolean };

const questionVide = (): QuestionForm => ({
  question: '', bonne_reponse: 'A',
  options: [{ cle: 'A', texte: '' }, { cle: 'B', texte: '' }, { cle: 'C', texte: '' }, { cle: 'D', texte: '' }]
});

export default function AdminQuizzFoot() {
  const [connecte, setConnecte] = useState(false);
  const [quizzes, setQuizzes] = useState<Quizz[]>([]);
  const [videoQuizz, setVideoQuizz] = useState<Quizz | null>(null);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');
  const [sportForm, setSportForm] = useState<Sport>('football');
  const [typeForm, setTypeForm] = useState<TypeQuizz>('weekend');

  const [titre, setTitre] = useState('');
  const [hook, setHook] = useState('');
  const [sponsors, setSponsors] = useState<Sponsor[]>([{ ...SPONSOR_VIDE }]);
  const [uploadingSponsor, setUploadingSponsor] = useState<number | null>(null);
  const majSponsor = (i: number, champ: keyof Sponsor, val: string) => setSponsors(prev => prev.map((s, idx) => idx === i ? { ...s, [champ]: val } : s));
  const uploadLogoSponsor = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingSponsor(i); setMessage('');
    try {
      const blob = await redimensionnerImage(file, 400, true);
      const nom = 'sponsor-quizz-' + Date.now() + '-' + i + '.png';
      const { error } = await supabase.storage.from('articles').upload(nom, blob, { contentType: 'image/png' });
      if (error) { setMessage('❌ Logo : ' + error.message); setUploadingSponsor(null); return; }
      majSponsor(i, 'logo', supabase.storage.from('articles').getPublicUrl(nom).data.publicUrl);
    } catch (err) {
      setMessage('❌ Logo : ' + (err instanceof Error ? err.message : 'erreur'));
    }
    setUploadingSponsor(null);
  };
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
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/quizz-foot-admin', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Impossible de charger les FootQuizz.')); return; }
    setQuizzes(data.quizzes || []);
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
    const rh = separerHook(texteColle);
    if (rh.hook) setHook(rh.hook);
    const parsees = parserQuestionsQuizz(rh.reste);
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
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setCreationEnCours(false); setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/quizz-foot-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ titre, hook: hookPublie(hook), sport: sportForm, type: typeForm, sponsors: sponsorsPublies(sponsors), questions: questions.map(q => ({ question: q.question, options: q.options, bonne_reponse: q.bonne_reponse })) })
    });
    const retour = await res.json().catch(() => ({}));
    setCreationEnCours(false);
    if (!res.ok) { setMessage('❌ ' + (retour.error || 'Erreur lors de la création.')); return; }
    setMessage('✅ FootQuizz publié !');
    setTitre(''); setHook(''); setSponsors([{ ...SPONSOR_VIDE }]); setQuestions(Array.from({ length: NB_QUESTIONS }, questionVide));
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
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 20px' }}>{NB_QUESTIONS} questions, 10 secondes par question, une seule tentative par utilisateur. Durée : 48 h pour le quizz du weekend, 72 h pour le quizz de semaine. Le tirage au sort parmi les ≥80% se fait manuellement, ici même.</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {(['weekend', 'semaine'] as TypeQuizz[]).map(t => (
                <button key={t} type="button" onClick={() => setTypeForm(t)} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: typeForm === t ? '#7c3aed' : '#333', color: '#fff' }}>{TYPES_QUIZZ[t].emoji} {TYPES_QUIZZ[t].label} ({TYPES_QUIZZ[t].heures} h)</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['football', 'basketball'] as Sport[]).map(s => (
                <button key={s} type="button" onClick={() => setSportForm(s)} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: sportForm === s ? SPORT_COULEURS[s].primaire : '#333', color: '#fff' }}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Titre du quizz</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="FootQuizz de la semaine" style={inputStyle} />
              <p style={{ fontSize: '12px', fontWeight: 800, color: '#e5e7eb', margin: '16px 0 6px' }}>🎣 Hook de la vidéo (optionnel)</p>
              <input value={hook} onChange={e => setHook(e.target.value.slice(0, MAX_HOOK))} placeholder="Ex : 10 questions, 1 seule tentative. Tu fais combien ?" style={inputStyle} />
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '6px 0 0' }}>Dans le format à coller : une ligne « Hook: ta phrase » ({hook.length}/{MAX_HOOK}).</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Sponsors du quizz (facultatif : nom et logo)</label>
              {sponsors.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                  <input value={s.nom} onChange={e => majSponsor(i, 'nom', e.target.value)} placeholder="Nom du sponsor" style={{ ...inputStyle, flex: 1 }} />
                  <label style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px dashed #555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', fontSize: '20px', flexShrink: 0 }}>
                    {s.logo ? <img src={s.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : (uploadingSponsor === i ? '…' : '🏢')}
                    <input type="file" accept="image/*" onChange={e => uploadLogoSponsor(i, e)} style={{ display: 'none' }} />
                  </label>
                  {s.logo && <button type="button" onClick={() => majSponsor(i, 'logo', '')} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>}
                  {sponsors.length > 1 && <button type="button" onClick={() => setSponsors(prev => prev.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✕</button>}
                </div>
              ))}
              {sponsors.length < MAX_SPONSORS && <button type="button" onClick={() => setSponsors(prev => [...prev, { ...SPONSOR_VIDE }])} style={{ padding: '8px 16px', borderRadius: '999px', border: '1px dashed #555', background: 'transparent', color: '#9ca3af', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>+ Ajouter un sponsor</button>}
            </div>

            <button type="button" onClick={() => setTexteColleOuvert(v => !v)} style={{ padding: '10px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', background: texteColleOuvert ? '#333' : VIOLET, color: '#fff', marginBottom: '16px' }}>{texteColleOuvert ? '✕ Fermer' : '📋 Coller les 10 questions'}</button>

            {texteColleOuvert && (
              <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>Un bloc par question, séparé par une ligne vide. Questions courtes, réponse simple : la question, puis les options (A à D), puis "Réponse: X".</p>
                <textarea value={texteColle} onChange={e => setTexteColle(e.target.value)} rows={14} placeholder={'Hook: Ton accroche ici\n' + "Qui a remporté le Ballon d'or 2025 ?\nA. Mbappé\nB. Vinicius\nC. Dembélé\nD. Yamal\nRéponse: C\n\nCombien de Ballons d'or Messi a-t-il gagnés ?\nA. 6\nB. 7\nC. 8\nD. 9\nRéponse: C"} style={{ ...inputStyle, marginBottom: '10px', fontFamily: 'monospace', fontSize: '13px' }} />
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
                    {typeDepuisDurees(q.created_at, q.date_fermeture) && <p style={{ color: '#a78bfa', fontSize: '11px', margin: '4px 0 0', fontWeight: 700 }}>{TYPES_QUIZZ[typeDepuisDurees(q.created_at, q.date_fermeture) as TypeQuizz].emoji} {TYPES_QUIZZ[typeDepuisDurees(q.created_at, q.date_fermeture) as TypeQuizz].label}</p>}
                    {q.statut === 'ouvert' && <p style={{ color: VIOLET, fontSize: '11px', margin: '4px 0 0', fontWeight: 700 }}>⏱️ Ferme le {new Date(q.date_fermeture).toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {q.statut !== 'tire' && (
                    <button onClick={() => declencherTirage(q.id)} disabled={tirageEnCours === q.id} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', background: VIOLET, color: '#fff' }}>{tirageEnCours === q.id ? '⏳...' : '🎲 Clôturer et tirer au sort'}</button>
                  )}
                  {q.questions && q.questions.length > 0 && (
                    <button onClick={() => setVideoQuizz(q)} style={{ padding: '8px 16px', borderRadius: '999px', border: '2px solid #10b981', cursor: 'pointer', fontWeight: 700, fontSize: '12px', background: 'transparent', color: '#10b981' }}>🎬 Vidéo</button>
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
      {videoQuizz && videoQuizz.questions && (
        <VideoModal titre={videoQuizz.titre} onFermer={() => setVideoQuizz(null)}
          post={{ titre: videoQuizz.titre, hook: videoQuizz.hook, quizz: { titre: videoQuizz.titre, sport: videoQuizz.sport, sponsors: videoQuizz.sponsors, duree_heures: (() => { const t = typeDepuisDurees(videoQuizz.created_at, videoQuizz.date_fermeture); return t ? TYPES_QUIZZ[t].heures : null; })(), questions: videoQuizz.questions.map(x => ({ question: x.question, options: x.options, bonne_reponse: x.bonne_reponse })) } }} />
      )}
    </div>
  );
}
