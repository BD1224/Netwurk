import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// reads ANTHROPIC_API_KEY from .env.local
export const client = new Anthropic();

export const MODEL = "claude-haiku-5-5";

// optional record of what Claude did, used by the test scripts
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

// Sends one prompt, lets Claude use its web tools, and returns all the text it wrote.
// Web tools run on Anthropic's side; if they run long Claude stops with "pause_turn"
// and we just send the conversation back so it keeps going.
export async function callClaude(
  system: string,
  prompt: string,
  tools: Anthropic.ToolUnion[],
  effort: "low" | "medium" | "high",
  log?: CallLog,
  signal?: AbortSignal // cancels the request when the user stops the search
) {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  for(let i = 0; i < 5; i++){
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      output_config: { effort: effort },
      system: system,
      tools: tools,
      messages: messages,
    }, { signal: signal });
    const res = await stream.finalMessage();

    if(log != null){
      for(const b of res.content){
        if(b.type == "server_tool_use" && b.name == "web_search"){
          log.searches.push((b.input as any).query);
        }
        if(b.type == "server_tool_use" && b.name == "web_fetch"){
          log.fetches.push((b.input as any).url);
        }
        // how many results each search actually returned
        if(b.type == "web_search_tool_result"){
          if(log.searchResults == null){
            log.searchResults = [];
          }
          if(log.searchHits == null){
            log.searchHits = [];
          }
          if(Array.isArray(b.content)){
            log.searchResults.push(b.content.length);
            for(const r of b.content){
              log.searchHits.push(r.title + "  |  " + r.url);
            }
          } else {
            log.searchResults.push(0);
          }
        }
      }
      log.inputTokens += res.usage.input_tokens;
      log.outputTokens += res.usage.output_tokens;
      log.stopReason = res.stop_reason ?? "";
    }

    if(res.stop_reason == "pause_turn"){
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
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
      log.rawText = text;
    }
    return text;
  }
  throw new Error("Claude never finished (paused too many times)");
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
