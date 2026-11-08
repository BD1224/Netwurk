import "server-only";
import { Candidate, PersonProfile, ResearchResult, SearchCriteria } from "@/types";
import { callGemini, pullJson, CallLog } from "@/lib/gemini";
import { serperSearch, SearchHit } from "@/lib/serper";
import { RESEARCHER_SYSTEM, researcherPrompt } from "./prompts";

// Stage 2: one person -> PersonProfile.
// Serper does the searching, then Gemini reads the results (no web tools).
// Returns null if Gemini's answer was bad twice, if it isn't sure it's the right
// person, or if the person doesn't match the search anymore.
export async function researchPerson(person: Candidate, criteria: SearchCriteria, log?: CallLog) {
  const queries = researcherQueries(person, criteria);
  const results: { query: string; hits: SearchHit[] }[] = [];
  const all = await Promise.all(queries.map(q => serperSearch(q, log)));
  for(let i = 0; i < queries.length; i++){
    results.push({ query: queries[i], hits: all[i] });
  }

  for(let tries = 0; tries < 2; tries++){
    const text = await callGemini(
      RESEARCHER_SYSTEM,
      researcherPrompt(person, criteria, results),
      "medium",
      log
    );

    const parsed = ResearchResult.safeParse(pullJson(text));
    if(parsed.success){
      const r = parsed.data;
      if(r.confidence == "low"){
        if(log != null) log.dropReason = "low confidence (could be someone else with the same name)";
        return null;
      }
      if(!r.matchesSearch){
        if(log != null) log.dropReason = "doesn't match the search";
        return null;
      }
      // PersonProfile.parse drops the two check fields
      return PersonProfile.parse(r);
    }
  }
  if(log != null) log.dropReason = "Gemini's answer wasn't valid JSON";
  return null;
}

// the exact Google searches for one person
export function researcherQueries(p: Candidate, c: SearchCriteria) {
  // if we don't know their org, use the company the user searched for
  let org = p.org;
  if(org == null && c.companies != null && c.companies.length > 0){
    org = c.companies[0];
  }
  let who = p.name;
  if(org != null){
    who += " " + org;
  }

  const qs: string[] = [];
  qs.push(who + " linkedin");
  if(c.roles != null && c.roles.length > 0){
    qs.push(who + " " + c.roles[0]);
  }
  // a search aimed at the school, so Gemini can check where they studied
  if(c.universities != null && c.universities.length > 0){
    qs.push(who + " " + c.universities[0]);
  }
  qs.push(who + " github.com");
  const research = c.researchAreas != null && c.researchAreas.length > 0;
  if(isAcademic(p.title) || research){
    qs.push(who + " google scholar");
    qs.push(who + " orcid");
  }
  return qs;
}

// only search google scholar for people whose title sounds like research
function isAcademic(title: string | null) {
  if(title == null){
    return false;
  }
  const t = title.toLowerCase();
  const words = ["professor", "phd", "ph.d", "postdoc", "research", "lecturer", "scientist"];
  for(const w of words){
    if(t.includes(w)){
      return true;
    }
  }
  return false;
}
