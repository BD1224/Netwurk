// GET /api/people/[id]/details - extra details for one search result (the Discover overlay):
// talking points, recent GitHub repos, papers, accolades and sources.
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { getPersonDetails } from "@/services/personDetails";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });

  const details = await getPersonDetails(id);
  if (!details) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(details, { headers: { "Cache-Control": "private, max-age=300" } });
}
