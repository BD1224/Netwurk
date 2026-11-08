// Finds a person's recent papers on OpenAlex (free scholarly database, https://openalex.org).
//   1. findAuthor(person): search OpenAlex authors by name, then Gemini picks which result
//      (if any) is this person. Runs once per person; the caller saves the id.
//   2. getPapers(openalexId): their 5 newest papers. Cheap, so it runs on every lookup
//      and the list stays up to date.
// OPENALEX_API_KEY is optional but needed in production: without it, requests share
// a tiny daily budget with everyone on the same IP (e.g. all of Vercel).
import "server-only";
import { callAI, pullJson } from "@/lib/ai";
import { NO_OPENALEX_MATCH, type Paper, type PapersResult, type PersonProfile } from "@/types";

const API = "https://api.openalex.org";
const MAX_CANDIDATES = 5;
const MAX_PAPERS = 5;

async function openalex(path: string, params: Record<string, string>) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (process.env.OPENALEX_API_KEY) url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`OpenAlex ${path} failed (${res.status})`);
  return res.json();
}

// "https://openalex.org/A5001226970" -> "A5001226970"
const shortId = (id: string) => id.split("/").pop()!;

type Author = {
  id: string;
  display_name: string;
  orcid: string | null;
  works_count: number;
  last_known_institutions?: { display_name: string }[];
  topics?: { display_name: string }[];
};

const AUTHOR_FIELDS = "id,display_name,orcid,works_count,last_known_institutions,topics";

// An ORCID iD is unique to one person, so it needs no guessing. null if OpenAlex doesn't have it.
async function authorByOrcid(orcid: string): Promise<string | null> {
  try {
    const a: Author = await openalex(`/authors/orcid:${orcid}`, { select: "id" });
    return a?.id ? shortId(a.id) : null;
  } catch {
    return null;
  }
}

// Authors with this name at the person's school/company. Common names can fall out of the
// plain name search's top results, so this narrows it. Empty if the org isn't known/found.
async function authorsAtOrg(person: PersonProfile): Promise<Author[]> {
  const org = person.university ?? person.company;
  if (!org) return [];
  try {
    const inst = await openalex("/institutions", { search: org, per_page: "1", select: "id" });
    const instId = inst.results?.[0]?.id;
    if (!instId) return [];
    const data = await openalex("/authors", {
      filter: `display_name.search:${person.fullName},last_known_institutions.id:${shortId(instId)}`,
      per_page: String(MAX_CANDIDATES),
      select: AUTHOR_FIELDS,
    });
    return data.results ?? [];
  } catch {
    return [];
  }
}

// Returns the person's OpenAlex author id, or null if no result is clearly them.
export async function findAuthor(person: PersonProfile): Promise<string | null> {
  if (person.orcid) {
    const id = await authorByOrcid(person.orcid);
    if (id) return id;
  }

  const [byName, atOrg] = await Promise.all([
    openalex("/authors", { search: person.fullName, per_page: String(MAX_CANDIDATES), select: AUTHOR_FIELDS }),
    authorsAtOrg(person),
  ]);
  // org matches first, then the plain name results, no repeats
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
    `name: ${person.fullName}\n` +
    `title: ${person.title ?? "unknown"}\n` +
    `company: ${person.company ?? "unknown"}\n` +
    `university: ${person.university ?? "unknown"}\n` +
    `location: ${person.location ?? "unknown"}\n` +
    `research areas: ${person.researchAreas.join(", ") || "unknown"}\n` +
    `google scholar profile: ${person.scholarUrl ?? "unknown"}\n\n` +
    `Database entries:\n${list}`;

  const answer = pullJson(await callAI(system, prompt, "low"));
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

// The author's profile links + newest papers.
export async function getPapers(openalexId: string): Promise<PapersResult> {
  const [author, works] = await Promise.all([
    openalex(`/authors/${openalexId}`, { select: "id,orcid" }),
    openalex("/works", {
      filter: `authorships.author.id:${openalexId}`,
      sort: "publication_date:desc",
      per_page: String(MAX_PAPERS * 2), // extra, because duplicates get dropped below
      select: "title,publication_year,doi,primary_location",
    }),
  ]);

  // OpenAlex lists a preprint and its published version as two works with the same title
  const seen = new Set<string>();
  const papers: Paper[] = (works.results as Work[])
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
      url: w.doi ?? w.primary_location?.landing_page_url ?? null,
    }));

  return {
    openalexId,
    profileUrl: `https://openalex.org/${openalexId}`,
    orcidUrl: author.orcid ?? null,
    papers,
  };
}

export const NOT_FOUND: PapersResult = { openalexId: NO_OPENALEX_MATCH, profileUrl: null, orcidUrl: null, papers: [] };
