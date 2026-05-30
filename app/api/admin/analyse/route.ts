export async function POST(request: Request) {
  const { match, competition, date_match } = await request.json();
  if (!match) {
    return Response.json({ error: 'Match requis' }, { status: 400 });
  }
  const prompt = 'Tu es un expert en pronostics sportifs. Analyse ce match et réponds UNIQUEMENT avec un objet JSON valide, rien d\'autre.\n\nMatch : ' + match + '\nCompétition : ' + (competition || 'Non précisée') + '\nDate : ' + (date_match || 'Non précisée') + '\n\nJSON attendu :\n{"contexte":"analyse en 3-4 phrases","confiance_globale":4,"paris":[{"niveau":"Classique","categorie":"Résultat","type_pari":"1N2","valeur":"Victoire ' + match.split(' ')[0] + '","cote":2.10,"confiance":4},{"niveau":"Classique","categorie":"Double chance","type_pari":"Double Chance","valeur":"1X","cote":1.45,"confiance":5},{"niveau":"Classique","categorie":"Buts","type_pari":"Total Goals","valeur":"Under 2.5 buts","cote":1.80,"confiance":3},{"niveau":"Simple","categorie":"Tirs","type_pari":"Shots","valeur":"Over 22.5 tirs","cote":1.75,"confiance":3},{"niveau":"Simple","categorie":"Corners","type_pari":"Corners","valeur":"Over 9.5 corners","cote":1.85,"confiance":3},{"niveau":"Complexe","categorie":"Buteur","type_pari":"Anytime","valeur":"Buteur probable","cote":2.80,"confiance":3},{"niveau":"Divin","categorie":"Corners","type_pari":"MAX","valeur":"Under 8.5 corners","cote":2.20,"confiance":2}]}';

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
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en pronostics sportifs. Tu réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans backticks, sans markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Pas de JSON trouvé', raw: text.substring(0, 300) }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return Response.json({ success: true, analyse: parsed });
    } catch {
      return Response.json({ error: 'JSON invalide', raw: text.substring(0, 300) }, { status: 500 });
    }
  } catch {
    return Response.json({ error: 'Erreur API Groq' }, { status: 500 });
  }
}