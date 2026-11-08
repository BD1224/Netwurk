// The search pipeline, called by /api/search (same flow as Simon's scripts/haiku-test.ts):
//   1. findCandidates(criteria) -> up to 20 people
//   2. researchPerson() on each, 5 at a time (so Serper doesn't rate limit us)
//   3. onPerson(profile) is called as soon as each person is done, so the route can stream it.
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
): Promise<number> {
  const candidates = (await findCandidates(criteria)).slice(0, MAX_PEOPLE);
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
