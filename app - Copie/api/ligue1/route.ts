export async function GET() {
  const res = await fetch(
    'https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=4334'
  );
  const data = await res.json();
  return Response.json(data);
}