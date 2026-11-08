import "server-only";
// Remembers the people the agent returned (for 24h) so the details overlay
// (GET /api/people/[id]/details) and "Save" can look a result up by id.
//
// In memory only: fine for local dev and a single server, but on serverless (Vercel) each instance
// has its own copy and it is lost on restart. Move this to a Supabase table before deploying.
import type { SearchPerson } from "@/types";

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PEOPLE = 500;

type Entry = { person: SearchPerson; expires: number };

// Kept on globalThis so it survives dev-server hot reloads.
const g = globalThis as typeof globalThis & { __agentResults?: Map<string, Entry> };
const store = (g.__agentResults ??= new Map<string, Entry>());

export function rememberPerson(person: SearchPerson) {
  store.delete(person.id);
  store.set(person.id, { person, expires: Date.now() + TTL_MS });
  while (store.size > MAX_PEOPLE) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function recallPerson(id: string): SearchPerson | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(id);
    return null;
  }
  return entry.person;
}
