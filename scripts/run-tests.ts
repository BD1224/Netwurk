import { writeFileSync } from "fs";
import { findCandidates } from "@/services/agents/orchestrator";
import { researchPerson } from "@/services/agents/researcher";
import { SearchCriteria, PersonProfile } from "@/types";

type Case = { name: string; criteria: SearchCriteria };

const cases: Case[] = [
  { name: "title-financial-analyst", criteria: { roles: ["Financial analyst"] } },
  { name: "title-registered-nurse", criteria: { roles: ["Registered nurse"] } },
  { name: "company-goldman-sachs", criteria: { companies: ["Goldman Sachs"] } },
  { name: "company-mayo-clinic", criteria: { companies: ["Mayo Clinic"] } },
  { name: "location-texas", criteria: { states: ["Texas"] } },
  { name: "location-boston", criteria: { states: ["Boston"] } },
  { name: "university-umass-amherst", criteria: { universities: ["UMass Amherst"] } },
  { name: "university-georgia-tech", criteria: { universities: ["Georgia Tech"] } },
  { name: "research-behavioral-economics", criteria: { researchAreas: ["behavioral economics"] } },
  { name: "research-crispr", criteria: { researchAreas: ["CRISPR gene editing"] } },
  { name: "full-stripe-swe", criteria: { roles: ["Software engineer"], companies: ["Stripe"], states: ["Massachusetts"], universities: ["UMass Amherst"], researchAreas: ["distributed systems"] } },
  { name: "academic-rl", criteria: { roles: ["Research scientist"], states: ["California"], universities: ["MIT"], researchAreas: ["reinforcement learning"] } },
  { name: "big-company-boeing-pm", criteria: { roles: ["Project manager"], companies: ["Boeing"], states: ["Washington"] } },
  { name: "big-company-google-pm", criteria: { roles: ["Product manager"], companies: ["Google"], states: ["New York"] } },
  { name: "narrow-vermont-ml", criteria: { roles: ["Machine learning engineer"], states: ["Vermont"], universities: ["Middlebury College"], researchAreas: ["natural language processing"] } },
  { name: "nonsense-marine-biologist", criteria: { roles: ["Marine biologist"], companies: ["Stripe"], states: ["Kansas"] } },
];

const HOW_MANY = 5;

// fetch a page and return its text, or null if we couldn't
async function getPage(url: string) {
  if(url.includes("linkedin.com")){
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    });
    if(!res.ok){
      return { status: res.status, text: "" };
    }
    const text = await res.text();
    return { status: res.status, text: text.toLowerCase() };
  } catch(e) {
    return { status: 0, text: "" };
  }
}

async function checkSources(p: PersonProfile) {
  const out: any[] = [];
  const last = p.fullName.trim().split(" ").pop()!.toLowerCase();
  for(const url of p.sources){
    const page = await getPage(url);
    if(page == null){
      out.push({ url: url, result: "unchecked (linkedin)" });
    } else if(page.status != 200){
      out.push({ url: url, result: "unchecked (status " + page.status + ")" });
    } else {
      out.push({
        url: url,
        result: "loaded",
        nameOnPage: page.text.includes(last),
        emailOnPage: p.email != null ? page.text.includes(p.email.toLowerCase()) : null,
      });
    }
  }
  return out;
}

async function runCase(c: Case) {
  const start = Date.now();
  const result: any = { name: c.name, criteria: c.criteria, candidates: [], people: [], problems: [], error: null, seconds: 0 };
  try {
    const list = await findCandidates(c.criteria);
    result.candidates = list;

    const names = list.map(x => x.name.toLowerCase());
    if(new Set(names).size != names.length){
      result.problems.push("duplicate candidate names");
    }

    const picked = list.slice(0, HOW_MANY);
    const profiles = await Promise.all(picked.map(x => researchPerson(x).catch(e => null)));

    for(let i = 0; i < picked.length; i++){
      const p = profiles[i];
      if(p == null){
        result.people.push({ candidate: picked[i].name, profile: null, sourceChecks: [] });
        result.problems.push(picked[i].name + ": researcher returned nothing valid");
        continue;
      }
      if((p.email == null) != (p.emailStatus == null)){
        result.problems.push(p.fullName + ": email and emailStatus don't match");
      }
      const checks = await checkSources(p);
      if(p.emailStatus == "confirmed"){
        let found = false;
        for(const s of checks){
          if(s.emailOnPage == true){
            found = true;
          }
        }
        if(!found){
          result.problems.push(p.fullName + ": email marked confirmed but not found on any checkable source");
        }
      }
      result.people.push({ candidate: picked[i].name, profile: p, sourceChecks: checks });
    }
  } catch(e: any) {
    result.error = String(e.message).slice(0, 500);
  }
  result.seconds = Math.round((Date.now() - start) / 1000);
  writeFileSync("scripts/output/" + c.name + ".json", JSON.stringify(result, null, 2));
  console.log("[" + c.name + "] " + result.candidates.length + " candidates, " + result.people.length + " researched, " + result.problems.length + " problems, " + (result.error != null ? "ERROR" : "ok") + ", " + result.seconds + "s");
  return result;
}

async function main(){
  const results: any[] = [];
  let next = 0;
  async function worker(){
    while(next < cases.length){
      const c = cases[next];
      next++;
      results.push(await runCase(c));
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const summary = cases.map(c => {
    const r = results.find(x => x.name == c.name);
    let confirmed = 0, guessed = 0, noEmail = 0, nameMatches = 0, nameChecked = 0;
    for(const p of r.people){
      if(p.profile == null) continue;
      if(p.profile.emailStatus == "confirmed") confirmed++;
      else if(p.profile.emailStatus == "guessed") guessed++;
      else noEmail++;
      for(const s of p.sourceChecks){
        if(s.result == "loaded"){
          nameChecked++;
          if(s.nameOnPage) nameMatches++;
        }
      }
    }
    return {
      name: r.name,
      criteria: r.criteria,
      candidates: r.candidates.length,
      researched: r.people.length,
      emails: { confirmed: confirmed, guessed: guessed, none: noEmail },
      sourcesLoaded: nameChecked,
      sourcesWithName: nameMatches,
      problems: r.problems,
      error: r.error,
      seconds: r.seconds,
    };
  });
  writeFileSync("scripts/output/summary.json", JSON.stringify(summary, null, 2));
  console.log("Done. See scripts/output/summary.json");
}

main();
