export async function GET() {
  try {
    const res = await fetch('https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=4334', { next: { revalidate: 300 } });
    if (!res.ok) return Response.json({ events: [] }, { status: 502 });
    const data = await res.json();
    return Response.json({ events: Array.isArray(data?.events) ? data.events : [] });
  } catch {
    return Response.json({ events: [] }, { status: 502 });
  }
}
