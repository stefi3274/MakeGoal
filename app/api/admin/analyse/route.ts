export async function POST(request: Request) {
  const { match, competition, date_match } = await request.json();
  if (!match) {
    return Response.json({ error: 'Match requis' }, { status: 400 });
  }
  const prompt = 'Tu es un expert en pronostics sportifs. Analyse le match suivant et réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans backticks.\n\nMatch : ' + match + '\nCompétition : ' + (competition || 'Non précisée') + '\nDate : ' + (date_match || 'Non précisée') + '\n\nRéponds avec ce format JSON exact :\n{\n  "contexte": "analyse détaillée du match en 3-4 phrases",\n  "confiance_globale": 4,\n  "paris": [\n    {"niveau": "Classique", "categorie": "Résultat", "type_pari": "1N2", "valeur": "Victoire [équipe]", "cote": 2.10, "confiance": 4},\n    {"niveau": "Classique", "categorie": "Double chance", "type_pari": "Double Chance", "valeur": "1X (domicile ou nul)", "cote": 1.45, "confiance": 5},\n    {"niveau": "Classique", "categorie": "Buts", "type_pari": "Total Goals", "valeur": "Under 2.5 buts", "cote": 1.80, "confiance": 3},\n    {"niveau": "Simple", "categorie": "Tirs", "type_pari": "Shots Total", "valeur": "Over 22.5 tirs", "cote": 1.75, "confiance": 3},\n    {"niveau": "Simple", "categorie": "Corners", "type_pari": "Corners Total", "valeur": "Over 9.5 corners", "cote": 1.85, "confiance": 3},\n    {"niveau": "Simple", "categorie": "Cartons", "type_pari": "Yellow Cards", "valeur": "Over 3.5 jaunes", "cote": 1.90, "confiance": 3},\n    {"niveau": "Complexe", "categorie": "Buteur", "type_pari": "Anytime Goalscorer", "valeur": "[joueur probable] buteur", "cote": 2.80, "confiance": 3},\n    {"niveau": "Divin", "categorie": "Corners", "type_pari": "Corners MAX", "valeur": "Under 8.5 corners", "cote": 2.20, "confiance": 2}\n  ]\n}';
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/`json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(clean);
      return Response.json({ success: true, analyse: parsed });
    } catch {
      return Response.json({ error: 'Réponse IA invalide', raw: text }, { status: 500 });
    }
  } catch {
    return Response.json({ error: 'Erreur API Groq' }, { status: 500 });
  }
}