import "server-only";
// The search pipeline, called by /api/search. Yields SearchEvents as work progresses.
// Runs Simon's agent in src/services/agents/ (needs ANTHROPIC_API_KEY and SERPER_API_KEY):
//   step 0 "Web search"   -> findCandidates: Google (Serper) searches of LinkedIn results; names and
//                            titles come from the result titles only, LinkedIn itself is never opened
//   steps 1-3             -> researchPerson for each candidate, a few at a time: a few Google searches
//                            (LinkedIn, GitHub, Scholar...), then Claude Haiku reads only those results;
//                            then findPhoto looks for a headshot (never from LinkedIn).
//                            Steps 1-3 advance as a third, two thirds, then all of the people finish.
//   Each person is sent to the browser as soon as their research is done.
//
// AGENT_MODE=test researches 3 people instead of 10, to spend fewer tokens while testing.
import type { CallLog } from "@/lib/anthropic";
import type { SearchCriteria, SearchEvent } from "@/types";
import { nameKey, toAgentCriteria, toSearchPerson } from "./agents/adapter";
import { findCandidates } from "./agents/orchestrator";
import { findPhoto } from "./agents/photos";
import { researchPerson } from "./agents/researcher";
import { rememberPerson } from "./agents/resultCache";

const RESEARCH_AT_ONCE = 4;

/** exclude: names of people this user has already been shown; they won't be returned again. */
export async function* runSearch(
  criteria: SearchCriteria,
  signal?: AbortSignal,
  exclude: string[] = [],
): AsyncGenerator<SearchEvent> {
  const missing = ["ANTHROPIC_API_KEY", "SERPER_API_KEY"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[search] missing in .env.local: ${missing.join(", ")}`);
    yield { type: "error", message: "Search isn't set up yet: the server is missing an API key." };
    return;
  }
  yield* runAgentSearch(criteria, signal, exclude);
}

async function* runAgentSearch(
  criteria: SearchCriteria,
  signal: AbortSignal | undefined,
  exclude: string[],
): AsyncGenerator<SearchEvent> {
  const howMany = process.env.AGENT_MODE === "test" ? 3 : 10;
  const agentCriteria = toAgentCriteria(criteria);
  const alreadySeen = new Set(exclude.map(nameKey));

  yield { type: "step", step: 0 };
  const found = await findCandidates(agentCriteria, undefined, signal, exclude);
  // Skip anyone already shown, then research at most twice as many as we want
  // (some get dropped as unsure or not a match).
  const fresh = found.filter((c) => !alreadySeen.has(nameKey(c.name)));
  const candidates = fresh.slice(0, howMany * 2);
  const expected = Math.min(candidates.length, howMany);
  console.log(
    `[search] ${found.length} candidates found, ${found.length - fresh.length} already seen, researching up to ${candidates.length} to get ${howMany}`,
  );
  yield { type: "found", count: expected };
  if (candidates.length === 0) {
    yield { type: "done", count: 0 };
    return;
  }

  let step = 1;
  yield { type: "step", step };

  // Research one candidate, then look for their photo. A failed or unsure lookup just drops
  // that person; it doesn't fail the whole search.
  const research = async (i: number) => {
    const log = newLog();
    try {
      const profile = await researchPerson(candidates[i], agentCriteria, log, signal);
      const person = profile && toSearchPerson(profile);
      if (!person) {
        console.log(`[search] dropped ${candidates[i].name}: ${log.dropReason ?? "profile didn't fit the app's format"}`);
        return null;
      }
      const photo = await findPhoto(person, signal);
      return {
        ...person,
        photo_url: photo.photoUrl,
        github_url: person.github_url ?? photo.githubUrl,
        sources: photo.source ? [...person.sources, photo.source] : person.sources,
      };
    } catch (err) {
      if (!signal?.aborted) console.error(`research failed for ${candidates[i].name}`, err);
      return null;
    }
  };

  // Work down the candidate list until `howMany` people are confirmed (or the list runs out).
  const seen = new Set<string>();
  let sent = 0;
  const wantMore = (running: number) => sent + running < howMany;
  for await (const person of inParallel(candidates.length, RESEARCH_AT_ONCE, research, wantMore)) {
    signal?.throwIfAborted();
    if (person && !seen.has(person.id) && !alreadySeen.has(nameKey(person.full_name))) {
      seen.add(person.id);
      rememberPerson(person);
      sent++;
      yield { type: "person", person };
    }
    const nextStep = sent * 3 >= expected * 2 ? 3 : sent * 3 >= expected ? 2 : 1;
    if (nextStep > step) {
      step = nextStep;
      yield { type: "step", step };
    }
  }

  yield { type: "done", count: sent };
}

const newLog = (): CallLog => ({
  searches: [],
  fetches: [],
  inputTokens: 0,
  outputTokens: 0,
  stopReason: "",
  rawText: "",
});

/**
 * Runs task(0..count-1), at most `limit` at a time, yielding each result as soon as it finishes.
 * Starts another task only while wantMore(tasksStillRunning) is true (checked after each yield).
 */
async function* inParallel<R>(
  count: number,
  limit: number,
  task: (i: number) => Promise<R>,
  wantMore: (running: number) => boolean = () => true,
) {
  const running = new Map<number, Promise<[number, R]>>();
  let next = 0;
  const fill = () => {
    while (next < count && running.size < limit && wantMore(running.size)) {
      const i = next++;
      running.set(i, task(i).then((r) => [i, r] as [number, R]));
    }
  };
  fill();
  while (running.size > 0) {
    const [i, result] = await Promise.race(running.values());
    running.delete(i);
    yield result;
    fill();
  }
}
