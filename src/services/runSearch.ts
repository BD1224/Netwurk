// The search pipeline, called by /api/search (same flow as Simon's scripts/haiku-test.ts):
//   1. findCandidates(criteria) -> up to 20 people
//   2. researchPerson() on each, 5 at a time (so Serper doesn't rate limit us)
//   3. findPhoto() for each researched person (their own site, team page, GitHub or Gravatar;
//      never LinkedIn)
//   4. onFound(count) once the candidate list is ready; onPerson(profile) as soon as each
//      person is done, so the route can stream both.
// Returns how many people were sent.
import "server-only";
import { findCandidates } from "@/services/agents/orchestrator";
import { findPhoto } from "@/services/agents/photos";
import { researchPerson } from "@/services/agents/researcher";
import type { PersonProfile, SearchCriteria } from "@/types";

const MAX_PEOPLE = 20;
const RESEARCH_AT_ONCE = 5;

/** "Dr. Jane Q. Doe" -> "jane doe": first + last name, to spot the same person across searches. */
function nameKey(fullName: string) {
  const parts = fullName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(dr|prof|mr|ms|mrs|jr|sr|phd)\b\.?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

/** exclude: names this user has already been shown; they won't be returned again. */
export async function runSearch(
  criteria: SearchCriteria,
  onPerson: (person: PersonProfile) => void,
  onFound: (count: number) => void = () => {},
  exclude: string[] = [],
): Promise<number> {
  if (process.env.MOCK_SEARCH === "1") return mockSearch(onPerson, onFound);

  const alreadySeen = new Set(exclude.map(nameKey));
  const candidates = (await findCandidates(criteria, undefined, exclude))
    .filter((c) => !alreadySeen.has(nameKey(c.name)))
    .slice(0, MAX_PEOPLE);
  onFound(candidates.length);
  let next = 0;
  let sent = 0;

  // each worker takes the next candidate until none are left
  async function worker() {
    while (next < candidates.length) {
      const c = candidates[next];
      next++;
      try {
        const profile = await researchPerson(c, criteria);
        // (the researcher may return a fuller name for someone already shown)
        if (profile && !alreadySeen.has(nameKey(profile.fullName))) {
          const photo = await findPhoto(profile);
          onPerson({
            ...profile,
            photoUrl: photo.photoUrl,
            githubUrl: profile.githubUrl ?? photo.githubUrl,
            sources: photo.source ? [...profile.sources, photo.source] : profile.sources,
          });
          sent++;
        }
      } catch (e) {
        // one failed person doesn't stop the search
        console.error(`[search] research failed for ${c.name}:`, e);
      }
    }
  }

  await Promise.all(Array.from({ length: RESEARCH_AT_ONCE }, () => worker()));
  return sent;
}

// MOCK_SEARCH=1 in .env.local: sends 3 fake people, one per second, without calling Gemini
// or Serper. For testing the UI without spending tokens.
async function mockSearch(
  onPerson: (person: PersonProfile) => void,
  onFound: (count: number) => void,
): Promise<number> {
  const names = ["Ada Lovelace", "Alan Turing", "Grace Hopper"];
  onFound(names.length);
  for (const [i, fullName] of names.entries()) {
    await new Promise((r) => setTimeout(r, 1000));
    onPerson({
      fullName,
      title: "Software Engineer",
      company: "Acme",
      university: null,
      location: "Boston, MA",
      email: `person${i}@acme.com`,
      emailStatus: i === 0 ? "confirmed" : "guessed",
      linkedinUrl: null,
      githubUrl: null,
      personalSite: null,
      researchAreas: [],
      talkingPoints: `Mock person ${i + 1}.`,
      sources: [],
    });
  }
  return names.length;
}
