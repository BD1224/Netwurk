// POST /api/search - runs on the server (a Vercel function).
// Checks the user is logged in (so strangers cannot spend our API credits), then runs
// runSearch() and streams back one SearchEvent per line (NDJSON) as each person finishes.
// Writes nothing to the database. Sets maxDuration so the search can run for a few minutes.
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/services/runSearch";
import { z } from "zod";
import { SearchCriteria, type SearchEvent } from "@/types";

const Exclude = z.array(z.string().trim().min(1).max(100)).max(300);

export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SearchCriteria.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid search filters" }, { status: 400 });
  const criteria = parsed.data;
  // Names this browser has already been shown, so the search finds different people.
  const seen = Exclude.safeParse(body?.exclude);
  const exclude = seen.success ? seen.data : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SearchEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const count = await runSearch(
          criteria,
          (person) => send({ type: "person", person }),
          (found) => send({ type: "found", count: found }),
          exclude,
        );
        send({ type: "done", count });
      } catch (e) {
        console.error("[search] failed:", e);
        send({ type: "error", message: "Search failed. Please try again." });
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
