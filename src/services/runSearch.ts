// The search pipeline, called by /api/search (same flow as Simon's scripts/haiku-test.ts):
//   1. findCandidates(criteria) -> up to 20 people
//   2. researchPerson() on each, 5 at a time (so Serper doesn't rate limit us)
//   3. onFound(count) once the candidate list is ready; onPerson(profile) as soon as each
//      person is done, so the route can stream both.
// Returns how many people were sent.
import "server-only";
import { findCandidates } from "@/services/agents/orchestrator";
import { researchPerson } from "@/services/agents/researcher";
import type { PersonProfile, SearchCriteria } from "@/types";

const MAX_PEOPLE = 20;
const RESEARCH_AT_ONCE = 5;

export async function runSearch(
  criteria: SearchCriteria,
  onPerson: (person: PersonProfile) => void,
  onFound: (count: number) => void = () => {},
): Promise<number> {
  if (process.env.MOCK_SEARCH === "1") return mockSearch(onPerson, onFound);

  const candidates = (await findCandidates(criteria)).slice(0, MAX_PEOPLE);
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
        if (profile) {
          onPerson(profile);
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

// MOCK_SEARCH=1 in .env.local: sends 3 fake people, one per second, without calling Claude
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
