// POST /api/search - runs a search and streams back NDJSON, one SearchEvent per line.
// Writes nothing to the database.
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { runSearch } from "@/services/runSearch";
import { z } from "zod";
import { SearchCriteriaSchema, type SearchEvent } from "@/types";

const ExcludeSchema = z.array(z.string().trim().min(1).max(100)).max(300);

export const maxDuration = 300; // seconds; raise to your Vercel plan's max

export async function POST(request: Request) {
  // The real agent costs money per search, so only logged-in users may run it.
  if (!supabaseConfigured) return Response.json({ error: "Sign-in isn't set up" }, { status: 503 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = SearchCriteriaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Fill at least one field" }, { status: 400 });
  }
  // Names this browser has already been shown, so the search finds different people.
  const exclude = ExcludeSchema.safeParse(body?.exclude);

  const encoder = new TextEncoder();
  const line = (event: SearchEvent) => encoder.encode(JSON.stringify(event) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runSearch(parsed.data, request.signal, exclude.success ? exclude.data : [])) {
          controller.enqueue(line(event));
        }
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("search failed", err);
          controller.enqueue(line({ type: "error", message: "Search failed. Try again." }));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed because the client went away
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
