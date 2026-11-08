import "server-only";
import { Candidate, PersonProfile, ResearchResult, SearchCriteria } from "@/types";
import { callClaude, pullJson, CallLog } from "@/lib/anthropic";
import { RESEARCHER_SYSTEM, researcherPrompt } from "./prompts";

// one person -> PersonProfile, or null if Claude's answer was bad twice in a row,
// or if Claude wasn't sure it was the right person / they don't match the search anymore
export async function researchPerson(person: Candidate, criteria: SearchCriteria, log?: CallLog) {
  for(let tries = 0; tries < 2; tries++){
    const text = await callClaude(
      RESEARCHER_SYSTEM,
      researcherPrompt(person, criteria),
      [
        { type: "web_search_20250305", name: "web_search", max_uses: 4 },
        { type: "web_fetch_20250910", name: "web_fetch", max_uses: 3 },
      ],
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
        if(log != null) log.dropReason = "doesn't match the search anymore";
        return null;
      }
      // PersonProfile.parse drops the two check fields
      return PersonProfile.parse(r);
    }
  }
  if(log != null) log.dropReason = "Claude's answer wasn't valid JSON";
  return null;
}
