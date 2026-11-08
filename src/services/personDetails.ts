import "server-only";
// Extra details for one search result, shown in the Discover overlay.
//   repos     - GitHub REST API (public, no scraping), 5 most recently pushed, cached 24h
//   papers, accolades, sources, talking points - whatever the search agent saved for that person
// Never scrapes LinkedIn: the LinkedIn URL is only ever shown as a link.
//
// The person comes from the caller (the browser's copy of the search result) or, failing that,
// from the agent's recent results (agents/resultCache, in memory: unreliable on serverless).
// Papers come from OpenAlex (services/papers.ts); the OpenAlex profile is added as a source.
// The agent doesn't collect accolades yet, so those are empty.
import { githubUsername } from "@/lib/github";
import { RepoSchema, type PersonDetails, type Repo, type SearchPerson } from "@/types";
import { sourceLinks } from "./agents/adapter";
import { recallPerson } from "./agents/resultCache";
import { papersFor } from "./papers";

const DAY_SECONDS = 24 * 60 * 60;

/** OpenAlex author ids already matched (or "none"), so each person is matched only once. */
const g = globalThis as typeof globalThis & { __openalexIds?: Map<string, string> };
const openalexIds = (g.__openalexIds ??= new Map<string, string>());

/** knownOpenalexId: a saved contact's id from an earlier lookup (skips matching). */
export async function getPersonDetails(
  id: string,
  given?: SearchPerson,
  knownOpenalexId?: string | null,
): Promise<PersonDetails | null> {
  const person = given ?? recallPerson(id);
  if (!person) return null;

  const username = githubUsername(person.github_url);
  const [repos, found] = await Promise.all([
    username ? recentRepos(username) : Promise.resolve(null),
    papersFor(person, knownOpenalexId ?? openalexIds.get(id)),
  ]);
  if (found) openalexIds.set(id, found.openalexId);
  const papers = found?.papers ?? [];
  const sources = sourceLinks(person.sources);
  if (found && papers.length > 0) {
    sources.push({ label: "openalex.org", url: `https://openalex.org/${found.openalexId}` });
  }

  return {
    person,
    talking_points: person.talking_points,
    repos: repos ?? [],
    papers,
    accolades: [],
    sources,
    openalex_id: found?.openalexId ?? null,
  };
}

type GitHubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  html_url: string;
};

/** Up to 5 public repos, most recently pushed first. null if GitHub is down or rate-limited. */
export async function recentRepos(username: string): Promise<Repo[] | null> {
  const token = process.env.GITHUB_TOKEN; // optional: raises the limit from 60 to 5,000 requests/hour
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "networking-finder",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: DAY_SECONDS },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GitHubRepo[];
    return data.flatMap((r) => {
      const parsed = RepoSchema.safeParse({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        pushed_at: r.pushed_at,
        url: r.html_url,
      });
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return null;
  }
}
