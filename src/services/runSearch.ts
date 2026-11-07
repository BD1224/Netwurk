import "server-only";
// The search pipeline, called by /api/search. Yields SearchEvents as work progresses:
//   step 0 "Web search"      -> find up to 20 candidates (search APIs only)
//   step 1 "GitHub"          -> public GitHub REST API
//   step 2 "Google Scholar"  -> publications / research areas
//   step 3 "Checking emails" -> confirmed vs guessed emails
// Rule for the real agent: never scrape LinkedIn. Use search APIs and public APIs only.
//
// STUB: for now this replays mock people with fake delays so the UI works end to end.
import type { SearchCriteria, SearchEvent } from "@/types";
import { MOCK_PEOPLE } from "./mock/people";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export async function* runSearch(
  _criteria: SearchCriteria,
  signal?: AbortSignal,
): AsyncGenerator<SearchEvent> {
  const people = MOCK_PEOPLE;

  yield { type: "step", step: 0 };
  await sleep(1400, signal);
  yield { type: "found", count: people.length };

  for (const step of [1, 2, 3]) {
    yield { type: "step", step };
    await sleep(step === 3 ? 900 : 1200, signal);
  }

  for (const person of people) {
    yield { type: "person", person };
    await sleep(550, signal);
  }

  yield { type: "done", count: people.length };
}
