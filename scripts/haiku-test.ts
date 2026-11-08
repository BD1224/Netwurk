import { writeFileSync } from "fs";
import { findCandidates } from "@/services/agents/orchestrator";
import { researchPerson } from "@/services/agents/researcher";
import { orchestratorPrompt, researcherPrompt } from "@/services/agents/prompts";
import { CallLog } from "@/lib/anthropic";
import { SearchCriteria, Candidate } from "@/types";

function newLog(): CallLog {
  return { searches: [], fetches: [], inputTokens: 0, outputTokens: 0, stopReason: "", rawText: "" };
}

// pull the "Searches to run" lines out of a prompt we built
function plannedSearches(prompt: string) {
  const out: string[] = [];
  const lines = prompt.split("\n");
  let on = false;
  for(const l of lines){
    if(l.startsWith("Searches to run")){
      on = true;
      continue;
    }
    if(on && l.trim() != ""){
      out.push(l.replace(/^\d+\.\s*/, ""));
    }
  }
  return out;
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
    planned: plannedSearches(researcherPrompt(c, criteria)),
    log: log,
    seconds: Math.round((Date.now() - start) / 1000),
  };
}

async function searchCase(name: string, criteria: SearchCriteria, howMany: number) {
  const log = newLog();
  const start = Date.now();
  const result: any = { name: name, criteria: criteria, planned: plannedSearches(orchestratorPrompt(criteria)), candidates: [], error: null, log: log, people: [] };
  try {
    result.candidates = await findCandidates(criteria, log);
  } catch(e: any) {
    result.error = String(e.message).slice(0, 2000);
  }
  result.orchestratorSeconds = Math.round((Date.now() - start) / 1000);
  const picked = result.candidates.slice(0, howMany);
  result.people = await Promise.all(picked.map((c: Candidate) => research(c, criteria)));
  return result;
}

async function main(){
  const results: any[] = [];

  results.push(await searchCase("narrow-wayfair-umass", {
    roles: ["Software engineer"], companies: ["Wayfair"], states: ["Boston"], universities: ["UMass Amherst"],
  }, 3));
  console.log("[narrow-wayfair-umass] done");

  results.push(await searchCase("nobody-marine-biologist", {
    roles: ["Marine biologist"], companies: ["Stripe"], states: ["Kansas"],
  }, 3));
  console.log("[nobody-marine-biologist] done");

  const r = await research({ name: "Michael Johnson", title: "Software Engineer", org: "Microsoft", urls: [] }, { roles: ["Software engineer"], companies: ["Microsoft"] });
  results.push({ name: "common-name-michael-johnson", people: [r] });
  console.log("[common-name-michael-johnson] done");

  for(const x of results){
    writeFileSync("scripts/output/haiku-" + x.name + ".json", JSON.stringify(x, null, 2));
  }

  const summary = results.map(x => ({
    name: x.name,
    error: x.error ?? null,
    planned: x.planned ?? null,
    ran: x.log ? x.log.searches : null,
    candidates: x.candidates ? x.candidates.map((c: Candidate) => c.name + " | " + c.title + " | " + c.org) : null,
    orchestratorTokens: x.log ? { in: x.log.inputTokens, out: x.log.outputTokens } : null,
    people: x.people.map((p: any) => ({
      name: p.candidate.name,
      ok: p.profile != null,
      error: p.error,
      planned: p.planned,
      ran: p.log.searches,
      fetched: p.log.fetches,
      tokens: { in: p.log.inputTokens, out: p.log.outputTokens },
      seconds: p.seconds,
      profile: p.profile,
      dropReason: p.log.dropReason ?? null,
      rawTextIfDropped: p.profile == null ? p.log.rawText.slice(0, 2500) : null,
    })),
  }));
  writeFileSync("scripts/output/haiku-summary.json", JSON.stringify(summary, null, 2));
  console.log("Saved scripts/output/haiku-summary.json");
}

main();
