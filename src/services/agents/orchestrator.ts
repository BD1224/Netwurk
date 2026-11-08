import "server-only";
import { z } from "zod";
import { SearchCriteria, Candidate } from "@/services/agents/types";
import { callClaude, pullJson, CallLog } from "@/lib/anthropic";
import { ORCHESTRATOR_SYSTEM, orchestratorPrompt } from "./prompts";

// filters -> up to 20 people to research
// exclude: names already shown to the user. AGENT_MODE=test runs 3 searches instead of 6.
export async function findCandidates(criteria: SearchCriteria, log?: CallLog, signal?: AbortSignal, exclude: string[] = []) {
  const text = await callClaude(
    ORCHESTRATOR_SYSTEM,
    orchestratorPrompt(criteria, exclude),
    [{ type: "web_search_20250305", name: "web_search", max_uses: process.env.AGENT_MODE == "test" ? 3 : 6 }],
    "low",
    log,
    signal
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
