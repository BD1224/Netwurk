// POST /api/search - the only API route. Runs on the server (a Vercel function).
// Checks the user is logged in (so strangers cannot spend our Claude credits), then calls
// runSearch() from src/services and streams back one SearchEvent per person as they finish.
// Writes nothing to the database. Sets maxDuration so the search can run for a few minutes.
// Still to add: parse the body as SearchCriteria, stream NDJSON. For now it only checks login.
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/services/runSearch";

export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  return Response.json({ result: await runSearch() });
}
