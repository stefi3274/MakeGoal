export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'soccer_uefa_champs_league';

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Clé API manquante' }, { status: 500 });
  }

  const url = 'https://api.the-odds-api.com/v4/sports/' + sport + '/odds/?apiKey=' + apiKey + '&regions=eu&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso';

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return Response.json({ error: 'Erreur API odds', matches: [] }, { status: 502 });
    }

    const data = await res.json();

    const matches = (data || []).slice(0, 10).map((match: {
      id: string;
      home_team: string;
      away_team: string;
      commence_time: string;
      bookmakers: {
        key: string;
        markets: {
          key: string;
          outcomes: { name: string; price: number }[];
        }[];
      }[];
    }) => {
      const bookmaker = match.bookmakers?.[0];
      const h2h = bookmaker?.markets?.find((m: {key: string}) => m.key === 'h2h');
      const totals = bookmaker?.markets?.find((m: {key: string}) => m.key === 'totals');

      const homeOdds = h2h?.outcomes?.find((o: {name: string; price: number}) => o.name === match.home_team)?.price;
      const awayOdds = h2h?.outcomes?.find((o: {name: string; price: number}) => o.name === match.away_team)?.price;
      const drawOdds = h2h?.outcomes?.find((o: {name: string; price: number}) => o.name === 'Draw')?.price;
      const over25 = totals?.outcomes?.find((o: {name: string; price: number}) => o.name === 'Over')?.price;
      const under25 = totals?.outcomes?.find((o: {name: string; price: number}) => o.name === 'Under')?.price;

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        date: match.commence_time,
        bookmaker: bookmaker?.key || 'N/A',
        odds: {
          home: homeOdds || null,
          draw: drawOdds || null,
          away: awayOdds || null,
          over25: over25 || null,
          under25: under25 || null,
        }
      };
    });

    return Response.json({ matches });
  } catch {
    return Response.json({ matches: [] }, { status: 500 });
  }
}