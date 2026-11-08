import "server-only";
// A person's recent papers from OpenAlex (free scholarly database, https://openalex.org).
// From the backend branch (BD1224), adapted to the app's SearchPerson shape:
//   1. findAuthor(person): by ORCID if we have one (exact), else search OpenAlex authors by name
//      (and at their school/company), then Haiku picks which result, if any, is this person.
//      A shared name alone is never enough.
//   2. getPapers(openalexId): their 5 newest papers, preprint duplicates removed.
// Each person is matched once: the id (or "none") is remembered in memory for search results
// and saved in a contact's details. OPENALEX_API_KEY is optional; without it, requests share a
// small daily budget per IP address (which on Vercel is shared with other sites).
import { callClaude, pullJson } from "@/lib/anthropic";
import type { Paper, SearchPerson } from "@/types";

const API = "https://api.openalex.org";
const MAX_CANDIDATES = 5;
const MAX_PAPERS = 5;
/** Papers are a nice extra: never let a slow OpenAlex hold up the details overlay. */
const TIME_LIMIT_MS = 8000;

/** Looked up, no matching author (most people in industry). */
export const NO_OPENALEX_MATCH = "none";

export type PapersResult = { openalexId: string; papers: Paper[] };

async function openalex(path: string, params: Record<string, string>, signal: AbortSignal) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (process.env.OPENALEX_API_KEY) url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`OpenAlex ${path} failed (${res.status})`);
  return res.json();
}

// "https://openalex.org/A5001226970" -> "A5001226970"
const shortId = (id: string) => id.split("/").pop()!;

type Author = {
  id: string;
  display_name: string;
  works_count: number;
  last_known_institutions?: { display_name: string }[];
  topics?: { display_name: string }[];
};
const AUTHOR_FIELDS = "id,display_name,works_count,last_known_institutions,topics";

/** An ORCID iD is unique to one person, so no guessing is needed. */
async function authorByOrcid(orcid: string, signal: AbortSignal): Promise<string | null> {
  try {
    const a: { id?: string } = await openalex(`/authors/orcid:${orcid}`, { select: "id" }, signal);
    return a?.id ? shortId(a.id) : null;
  } catch {
    return null;
  }
}

/** Authors with this name at the person's school or company (common names can drop out of the
 *  plain name search's top results). Empty if the organization isn't known or found. */
async function authorsAtOrg(person: SearchPerson, signal: AbortSignal): Promise<Author[]> {
  const org = person.university ?? person.company;
  if (!org) return [];
  try {
    const inst = await openalex("/institutions", { search: org, per_page: "1", select: "id" }, signal);
    const instId = inst.results?.[0]?.id;
    if (!instId) return [];
    const data = await openalex(
      "/authors",
      {
        filter: `display_name.search:${person.full_name},last_known_institutions.id:${shortId(instId)}`,
        per_page: String(MAX_CANDIDATES),
        select: AUTHOR_FIELDS,
      },
      signal,
    );
    return data.results ?? [];
  } catch {
    return [];
  }
}

/** The person's OpenAlex author id, or null if no result is clearly them. */
async function findAuthor(person: SearchPerson, signal: AbortSignal): Promise<string | null> {
  if (person.orcid) {
    const id = await authorByOrcid(person.orcid, signal);
    if (id) return id;
  }

  const [byName, atOrg] = await Promise.all([
    openalex("/authors", { search: person.full_name, per_page: String(MAX_CANDIDATES), select: AUTHOR_FIELDS }, signal),
    authorsAtOrg(person, signal),
  ]);
  const seen = new Set<string>();
  const authors: Author[] = [...atOrg, ...((byName.results ?? []) as Author[])].filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  if (authors.length === 0) return null;

  const list = authors
    .map((a, i) => {
      const orgs = a.last_known_institutions?.map((x) => x.display_name).join(", ") || "unknown";
      const topics = a.topics?.slice(0, 5).map((t) => t.display_name).join(", ") || "unknown";
      return `${i + 1}. ${a.display_name} | institutions: ${orgs} | topics: ${topics} | papers: ${a.works_count}`;
    })
    .join("\n");

  const system =
    "You match a person to an entry in a scholarly database. Only pick an entry if the " +
    "institution or research topics clearly fit the person. A shared name alone is not enough. " +
    'Reply with JSON only: {"match": <entry number>} or {"match": null}.';
  const prompt =
    `Person:\n` +
    `name: ${person.full_name}\n` +
    `title: ${person.title ?? "unknown"}\n` +
    `company: ${person.company ?? "unknown"}\n` +
    `university: ${person.university ?? "unknown"}\n` +
    `location: ${person.location ?? "unknown"}\n` +
    `research areas: ${person.research_areas.join(", ") || "unknown"}\n` +
    `google scholar profile: ${person.scholar_url ?? "unknown"}\n\n` +
    `Database entries:\n${list}`;

  const answer = pullJson(await callClaude(system, prompt, "low", undefined, signal));
  const n = answer?.match;
  if (typeof n !== "number" || n < 1 || n > authors.length) return null;
  return shortId(authors[n - 1].id);
}

type Work = {
  title: string | null;
  publication_year: number | null;
  doi: string | null;
  primary_location?: { landing_page_url: string | null; source: { display_name: string } | null } | null;
};

const httpUrl = (v: string | null | undefined) => (v && /^https?:\/\//.test(v) ? v : null);

async function getPapers(openalexId: string, signal: AbortSignal): Promise<Paper[]> {
  const works = await openalex(
    "/works",
    {
      filter: `authorships.author.id:${openalexId}`,
      sort: "publication_date:desc",
      per_page: String(MAX_PAPERS * 2), // extra, because duplicates get dropped below
      select: "title,publication_year,doi,primary_location",
    },
    signal,
  );
  // OpenAlex lists a preprint and its published version as two works with the same title.
  const seen = new Set<string>();
  return ((works.results ?? []) as Work[])
    .filter((w) => {
      if (!w.title) return false;
      const key = w.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_PAPERS)
    .map((w) => ({
      title: w.title!,
      year: w.publication_year,
      venue: w.primary_location?.source?.display_name ?? null,
      url: httpUrl(w.doi) ?? httpUrl(w.primary_location?.landing_page_url),
    }));
}

/**
 * The person's newest papers. Pass a known OpenAlex id (or "none") to skip matching.
 * Never throws: on errors or the time limit it returns no papers (and no id, so it's retried).
 */
export async function papersFor(person: SearchPerson, knownId?: string | null): Promise<PapersResult | null> {
  if (knownId === NO_OPENALEX_MATCH && !person.orcid) return { openalexId: NO_OPENALEX_MATCH, papers: [] };
  const signal = AbortSignal.timeout(TIME_LIMIT_MS);
  try {
    const id = knownId && knownId !== NO_OPENALEX_MATCH ? knownId : await findAuthor(person, signal);
    if (!id) return { openalexId: NO_OPENALEX_MATCH, papers: [] };
    return { openalexId: id, papers: await getPapers(id, signal) };
  } catch (err) {
    console.error("[papers] lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
