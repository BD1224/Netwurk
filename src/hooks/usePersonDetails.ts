"use client";
// Loads the extras for one open person (search overlay or contact panel):
//   repos  - straight from GitHub's public API (browser), using the username in githubUrl
//   papers - POST /api/papers (server: OpenAlex + a Haiku match the first time)
// Each starts as "loading" and ends as a list or "error", which is what ExtrasGrid expects.
// Results are kept in memory per key for the whole visit, so reopening someone is instant.
//
// Usage:
//   usePersonDetails(result.key, result)                        // search result
//   usePersonDetails(contact.id, contact, {                     // saved contact
//     openalexId: contact.openalexId,
//     onMatched: (id) => updateContact(contact.id, { openalexId: id }),
//   })
// onMatched fires once, after the first lookup, with the OpenAlex id or "none" (no match),
// so the caller can save it and never match that person again.
import { useEffect, useRef, useState } from "react";
import { githubUsername } from "@/lib/github";
import { NO_OPENALEX_MATCH, type Loadable, type Paper, type PapersResult, type PersonProfile, type Repo } from "@/types";

export type PersonDetails = {
  repos: Loadable<Repo>;
  papers: Loadable<Paper>;
  openalexUrl: string | null;
  orcidUrl: string | null;
};

type Options = {
  openalexId?: string | null;
  onMatched?: (openalexId: string) => void;
};

const MAX_REPOS = 5;
const EMPTY: PersonDetails = { repos: "loading", papers: "loading", openalexUrl: null, orcidUrl: null };

// Shared by every component, so moving between pages doesn't refetch.
const cache = new Map<string, PersonDetails>();

export function usePersonDetails(
  key: string | null,
  person: PersonProfile | null,
  { openalexId = null, onMatched }: Options = {},
): PersonDetails | null {
  const [, rerender] = useState(0);
  // read the latest values inside the effect without making them dependencies
  const latest = useRef({ person, openalexId, onMatched });
  useEffect(() => {
    latest.current = { person, openalexId, onMatched };
  });

  useEffect(() => {
    const { person } = latest.current;
    if (!key || !person || cache.has(key)) return;
    cache.set(key, EMPTY);
    const update = (changes: Partial<PersonDetails>) => {
      cache.set(key, { ...cache.get(key)!, ...changes });
      rerender((n) => n + 1);
    };

    fetchRepos(person.githubUrl)
      .then((repos) => update({ repos }))
      .catch(() => update({ repos: "error" }));

    fetchPapers(person, latest.current.openalexId)
      .then((result) => {
        update({ papers: result.papers, openalexUrl: result.profileUrl, orcidUrl: result.orcidUrl });
        if (result.openalexId !== latest.current.openalexId) {
          latest.current.onMatched?.(result.openalexId);
        }
      })
      .catch(() => update({ papers: "error" }));
    // Requests aren't aborted on close: the result is cached for when they reopen.
  }, [key]);

  if (!key || !person) return null;
  return cache.get(key) ?? EMPTY;
}

// The user's most recently pushed public repos (not forks). No GitHub link -> [].
// Unauthenticated GitHub allows ~60 requests/hour per user, plenty for opening people one by one.
async function fetchRepos(githubUrl: string | null): Promise<Repo[]> {
  const username = githubUsername(githubUrl);
  if (!username) return [];
  const res = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=20`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) return []; // profile link was wrong or the account is gone
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  type GitHubRepo = {
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    pushed_at: string;
    html_url: string;
    fork: boolean;
  };
  const repos: GitHubRepo[] = await res.json();
  return repos
    .filter((r) => !r.fork)
    .slice(0, MAX_REPOS)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
      url: r.html_url,
    }));
}

async function fetchPapers(person: PersonProfile, openalexId: string | null): Promise<PapersResult> {
  // already checked, no match: nothing to ask the server
  if (openalexId === NO_OPENALEX_MATCH) {
    return { openalexId, profileUrl: null, orcidUrl: null, papers: [] };
  }
  const res = await fetch("/api/papers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person, openalexId }),
  });
  if (!res.ok) throw new Error(`Papers ${res.status}`);
  return res.json();
}
