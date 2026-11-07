import "server-only";
// Extra details for one search result, shown in the Discover overlay.
//   repos     - GitHub REST API (public, no scraping), 5 most recently pushed, cached 24h
//   papers, accolades, sources, talking points - whatever the search agent saved for that person
// Never scrapes LinkedIn: the LinkedIn URL is only ever shown as a link.
//
// STUB: the "saved by the search agent" part reads the mock data. Once the real agent runs,
// it must store each result's details (keyed by person id) somewhere this can read them.
import { githubUsername } from "@/lib/github";
import { RepoSchema, type PersonDetails, type Repo } from "@/types";
import { MOCK_PEOPLE } from "./mock/people";
import { MOCK_DETAILS } from "./mock/personDetails";

const DAY_SECONDS = 24 * 60 * 60;

export async function getPersonDetails(id: string): Promise<PersonDetails | null> {
  const person = MOCK_PEOPLE.find((p) => p.id === id);
  if (!person) return null;
  const saved = MOCK_DETAILS[id];

  const username = githubUsername(person.github_url);
  const repos = (username ? await recentRepos(username) : null) ?? saved?.repos ?? [];

  return {
    person,
    talking_points: saved?.talking_points ?? person.talking_points,
    repos,
    papers: saved?.papers ?? [],
    accolades: saved?.accolades ?? [],
    sources: saved?.sources ?? [],
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
