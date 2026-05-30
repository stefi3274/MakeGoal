import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function POST(request: Request) {
  const body = await request.json();
  const { match, competition, date_match, lieu, contexte, confiance_globale, paris } = body;

  if (!match || !date_match || !confiance_globale) {
    return Response.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
  }

  const { data: pronostic, error: e1 } = await supabase
    .from('pronostics')
    .insert({ match, competition, date_match, lieu, contexte, confiance_globale, publie: false })
    .select()
    .single();

  if (e1 || !pronostic) {
    return Response.json({ error: 'Erreur création pronostic' }, { status: 500 });
  }

  if (paris && paris.length > 0) {
    const parisAvecId = paris.map((p: {
      niveau: string;
      categorie: string;
      type_pari: string;
      valeur: string;
      seuil?: number;
      sens?: string;
      cote?: number;
      confiance?: number;
      ordre?: number;
    }) => ({ ...p, pronostic_id: pronostic.id }));

    const { error: e2 } = await supabase
      .from('pronostics_paris')
      .insert(parisAvecId);

    if (e2) {
      return Response.json({ error: 'Erreur création paris' }, { status: 500 });
    }
  }

  return Response.json({ success: true, id: pronostic.id });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, publie } = body;

  const { error } = await supabase
    .from('pronostics')
    .update({ publie })
    .eq('id', id);

  if (error) {
    return Response.json({ error: 'Erreur mise à jour' }, { status: 500 });
  }

  return Response.json({ success: true });
}