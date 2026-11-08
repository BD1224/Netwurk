import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// reads ANTHROPIC_API_KEY from .env.local
export const client = new Anthropic();

export const MODEL = "claude-haiku-5-5";

// optional record of what happened, used by the test scripts
export type CallLog = {
  searches: string[];
  fetches: string[];
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
  rawText: string;
  dropReason?: string;
  searchResults?: number[];
  searchHits?: string[];
};

// Sends one prompt to Claude (no tools; Serper does the searching) and returns its text.
export async function callClaude(
  system: string,
  prompt: string,
  effort: "low" | "medium" | "high",
  log?: CallLog
) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: effort },
    system: system,
    messages: [{ role: "user", content: prompt }],
  });
  const res = await stream.finalMessage();

  if(res.stop_reason == "refusal"){
    throw new Error("Claude refused the request");
  }

  let text = "";
  for(const b of res.content){
    if(b.type == "text"){
      text += b.text;
    }
  }
  if(log != null){
    log.inputTokens += res.usage.input_tokens;
    log.outputTokens += res.usage.output_tokens;
    log.stopReason = res.stop_reason ?? "";
    log.rawText = text;
  }
  return text;
}

// Claude's answer is JSON, but sometimes it has extra words or ``` around it.
// Grab everything from the first { to the last } and parse that.
export function pullJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if(start == -1 || end == -1){
    return null;
  }
  try {
    return JSON.parse(text.substring(start, end + 1));
  } catch(e) {
    return null;
  }
}
