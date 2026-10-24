import { tousLesJoueurs, journeeCourante, estOuverte } from '../../../lib/fantasyServeur';

// Liste publique des joueurs disponibles (prix, poste, club) et état de la journée courante.
export async function GET() {
  const [joueurs, journee] = await Promise.all([tousLesJoueurs(true), journeeCourante()]);
  return Response.json({
    joueurs,
    journee: journee ? { id: journee.id, titre: journee.titre, statut: journee.statut, date_limite: journee.date_limite } : null,
    ouverte: estOuverte(journee),
  });
}
