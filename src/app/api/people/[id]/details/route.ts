// Extra details for one search result (the Discover overlay): talking points, recent GitHub
// repos, papers, accolades and sources.
//   POST /api/people/[id]/details  body = the SearchPerson the browser already has (normal case)
//   GET  /api/people/[id]/details  looks the person up in recent results (a shared ?person= link)
// POST doesn't depend on the server remembering the search, which matters on Vercel: each
// request can run on a different server instance.
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { getPersonDetails } from "@/services/personDetails";
import { SearchPersonSchema, type SearchPerson } from "@/types";

type Context = { params: Promise<{ id: string }> };

async function respond(id: string, person?: SearchPerson) {
  if (!supabaseConfigured) return Response.json({ error: "Sign-in isn't set up" }, { status: 503 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "Not logged in" }, { status: 401 });
  if (!/^[\w-]{1,64}$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });

  const details = await getPersonDetails(id, person);
  if (!details) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(details, { headers: { "Cache-Control": "private, max-age=300" } });
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  return respond(id);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const parsed = SearchPersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== id) return Response.json({ error: "Bad person" }, { status: 400 });
  return respond(id, parsed.data);
}
