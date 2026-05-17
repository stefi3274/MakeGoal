export async function GET() {
  const response = await fetch(
    'https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=4334'
  );

  const data = await response.json();
  return Response.json(data);
}