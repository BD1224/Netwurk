import { writeFileSync } from "fs";
import { findCandidates } from "@/services/agents/orchestrator";
import { researchPerson, researcherQueries } from "@/services/agents/researcher";
import { CallLog } from "@/lib/anthropic";
import { SearchCriteria, Candidate } from "@/services/agents/types";

function newLog(): CallLog {
  return { searches: [], fetches: [], inputTokens: 0, outputTokens: 0, stopReason: "", rawText: "" };
}

async function research(c: Candidate, criteria: SearchCriteria) {
  const log = newLog();
  const start = Date.now();
  let profile = null;
  let error = null;
  try {
    profile = await researchPerson(c, criteria, log);
  } catch(e: any) {
    error = String(e.message).slice(0, 1000);
  }
  return {
    candidate: c,
    profile: profile,
    error: error,
    planned: researcherQueries(c, criteria),
    log: log,
    seconds: Math.round((Date.now() - start) / 1000),
  };
}

// stage 1, then research every candidate
async function searchCase(name: string, criteria: SearchCriteria) {
  const log = newLog();
  const start = Date.now();
  const result: any = { name: name, criteria: criteria, candidates: [], error: null, log: log, people: [] };
  try {
    result.candidates = await findCandidates(criteria, log);
  } catch(e: any) {
    result.error = String(e.message).slice(0, 2000);
  }
  result.findSeconds = Math.round((Date.now() - start) / 1000);

  // research 5 people at a time (not all at once) so Serper doesn't rate limit us
  const people: any[] = new Array(result.candidates.length);
  let next = 0;
  async function worker(){
    while(next < result.candidates.length){
      const i = next;
      next++;
      people[i] = await research(result.candidates[i], criteria);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  result.people = people;
  result.seconds = Math.round((Date.now() - start) / 1000);
  return result;
}

async function main(){
  const results: any[] = [];

  results.push(await searchCase("narrow-wayfair-umass", {
    roles: ["Software engineer"], companies: ["Wayfair"], states: ["Boston"], universities: ["UMass Amherst"],
  }));
  console.log("[narrow-wayfair-umass] done");

  results.push(await searchCase("nobody-marine-biologist", {
    roles: ["Marine biologist"], companies: ["Stripe"], states: ["Kansas"],
  }));
  console.log("[nobody-marine-biologist] done");

  const r = await research({ name: "Michael Johnson", title: "Software Engineer", org: "Microsoft", urls: [] }, { roles: ["Software engineer"], companies: ["Microsoft"] });
  results.push({ name: "common-name-michael-johnson", people: [r] });
  console.log("[common-name-michael-johnson] done");

  for(const x of results){
    writeFileSync("scripts/output/serper-" + x.name + ".json", JSON.stringify(x, null, 2));
  }

  const summary = results.map(x => ({
    name: x.name,
    error: x.error ?? null,
    findQueries: x.log ? x.log.searches : null,
    resultsPerQuery: x.log ? x.log.searchResults : null,
    candidates: x.candidates ? x.candidates.map((c: Candidate) => c.name + " | " + c.title + " | " + c.org) : null,
    findSeconds: x.findSeconds ?? null,
    seconds: x.seconds ?? null,
    people: x.people.map((p: any) => ({
      name: p.candidate.name,
      shown: p.profile != null,
      dropReason: p.log.dropReason ?? null,
      error: p.error,
      planned: p.planned,
      ran: p.log.searches,
      tokens: { in: p.log.inputTokens, out: p.log.outputTokens },
      seconds: p.seconds,
      profile: p.profile,
      rawTextIfDropped: p.profile == null ? p.log.rawText.slice(0, 2500) : null,
    })),
  }));
  writeFileSync("scripts/output/serper-summary.json", JSON.stringify(summary, null, 2));
  console.log("Saved scripts/output/serper-summary.json");
}

main();
