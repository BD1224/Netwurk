import "server-only";
import { z } from "zod";
import { SearchCriteria, Candidate } from "@/types";
import { callClaude, pullJson, CallLog } from "@/lib/anthropic";
import { ORCHESTRATOR_SYSTEM, orchestratorPrompt } from "./prompts";

// filters -> up to 20 people to research
export async function findCandidates(criteria: SearchCriteria, log?: CallLog) {
  const text = await callClaude(
    ORCHESTRATOR_SYSTEM,
    orchestratorPrompt(criteria),
    [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    "low",
    log
  );

  const json = pullJson(text);
  const parsed = z.object({ candidates: z.array(Candidate) }).safeParse(json);
  if(!parsed.success){
    throw new Error("Orchestrator didn't return a valid list of people:\n" + text);
  }

  let list: Candidate[] = parsed.data.candidates;
  if(list.length > 20){
    list = list.slice(0, 20);
  }
  return list;
}
