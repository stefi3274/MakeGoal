// Source UNIQUE du « Mini quizz sans réponse » (admin, post public, vidéo).
// 3 questions, 4 choix A à D. AUCUNE bonne réponse n'est saisie, stockée ni affichée :
// les gens commentent leurs réponses et partagent, les cadeaux sont tirés parmi les bonnes réponses.

export type MiniOption = { cle: string; texte: string };
export type MiniQuestion = { question: string; options: MiniOption[] };
export type MiniQuizzDetails = { titre: string; cadeau: string; questions: MiniQuestion[] };

export const MINI_MAX_QUESTIONS = 3;
export const CLES = ['A', 'B', 'C', 'D'];
export const QUESTION_VIDE = (): MiniQuestion => ({ question: '', options: CLES.map(cle => ({ cle, texte: '' })) });
export const MINI_VIDE = (): MiniQuizzDetails => ({ titre: '', cadeau: '', questions: Array.from({ length: MINI_MAX_QUESTIONS }, QUESTION_VIDE) });

export const optionsPubliees = (q: MiniQuestion) => (q.options || []).filter(o => (o.texte || '').trim() !== '');
export const questionsPubliees = (qs: MiniQuestion[] | null | undefined) =>
  (qs || []).filter(q => (q.question || '').trim() !== '' && optionsPubliees(q).length >= 2).slice(0, MINI_MAX_QUESTIONS);
export const miniValide = (m: MiniQuizzDetails | null | undefined) => !!m && questionsPubliees(m.questions).length > 0;

// Format :
//   Titre : Mini quizz Ligue des champions
//   Cadeau : Un maillot dédicacé
//   Q1. Qui a gagné la finale 2022 ?
//   A) Liverpool
//   B) Real Madrid
//   C) City
//   D) PSG
//   Q2. ...
export function parserMiniQuizz(texte: string): { details: MiniQuizzDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const questions: MiniQuestion[] = [];
  let titre = '', cadeau = '';
  const ignorees: string[] = [];
  let courante: MiniQuestion | null = null;
  for (const brut of lignes) {
    const mT = brut.match(/^titre\s*[:=]\s*(.+)$/i);
    if (mT) { titre = mT[1].trim(); continue; }
    const mC = brut.match(/^(?:cadeaux?|lots?)\s*[:=]\s*(.+)$/i);
    if (mC) { cadeau = mC[1].trim(); continue; }
    const mO = brut.match(/^\(?([A-Da-d])\s*[\)\.\:\-]\s*(.+)$/);
    if (mO) {
      if (!courante) { ignorees.push(brut); continue; }
      const cle = mO[1].toUpperCase();
      const o = courante.options.find(x => x.cle === cle);
      if (o) o.texte = mO[2].trim(); else ignorees.push(brut);
      continue;
    }
    const q = brut.replace(/^(?:q(?:uestion)?\s*)?\d{1,2}\s*[\)\.\:\-]?\s*/i, '').trim();
    if (!q) { ignorees.push(brut); continue; }
    if (questions.length >= MINI_MAX_QUESTIONS) { ignorees.push(brut); courante = null; continue; }
    courante = QUESTION_VIDE(); courante.question = q; questions.push(courante);
  }
  while (questions.length < MINI_MAX_QUESTIONS) questions.push(QUESTION_VIDE());
  return { details: { titre, cadeau, questions }, ignorees };
}
