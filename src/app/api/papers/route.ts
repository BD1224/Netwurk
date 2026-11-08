// POST /api/papers - a person's recent papers from OpenAlex. Server-only because the
// first lookup asks Haiku (secret key) which OpenAlex author is this person.
// Body: { person: PersonProfile, openalexId?: string }
//   - openalexId is an id (already matched): skip matching, just fetch papers.
//   - openalexId is "none" (already checked, no match): return no papers right away.
//   - not given: match first. The caller should keep the returned openalexId, id or "none"
//     (useContacts.updateContact for saved contacts) so matching only happens once.
// Returns PapersResult. Writes nothing to the database.
import { createClient } from "@/lib/supabase/server";
import { NOT_FOUND, findAuthor, getPapers } from "@/services/papers";
import { NO_OPENALEX_MATCH, PapersRequest } from "@/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const parsed = PapersRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { person, openalexId } = parsed.data;

  if (openalexId === NO_OPENALEX_MATCH) return Response.json(NOT_FOUND);
  try {
    const id = openalexId ?? (await findAuthor(person));
    return Response.json(id ? await getPapers(id) : NOT_FOUND);
  } catch (e) {
    console.error("[papers] failed:", e);
    return Response.json({ error: "Could not load papers" }, { status: 502 });
  }
}
