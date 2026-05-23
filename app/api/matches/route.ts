export async function GET() {
  try {
    const res = await fetch(
      "https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=4334",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) {
      return Response.json({ matches: [] }, { status: 502 });
    }
    const data = await res.json();
    const matches = data.events ?? [];
    return Response.json({ matches });
  } catch (err) {
    return Response.json({ matches: [] }, { status: 500 });
  }
}