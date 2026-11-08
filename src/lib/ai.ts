import "server-only";
// The AI model the agent uses: Google Gemini (via the official @google/genai SDK).
// The key is read from GEMINI_API_KEY, or else from ANTHROPIC_API_KEY (the old variable name,
// which now holds the Gemini key). GEMINI_MODEL can override the model without a code change.
import { GoogleGenAI } from "@google/genai";

export const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

let client: GoogleGenAI | null = null;
function gemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No AI key: set GEMINI_API_KEY (or ANTHROPIC_API_KEY) in .env.local");
  return (client ??= new GoogleGenAI({ apiKey }));
}

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

// Sends one prompt to Gemini (no tools; Serper does the searching) and returns its text.
// Every caller wants JSON back, so Gemini is asked to reply with JSON only.
// effort is kept for the callers; Gemini's default thinking is used for all of them.
export async function callAI(
  system: string,
  prompt: string,
  _effort: "low" | "medium" | "high",
  log?: CallLog,
  signal?: AbortSignal,
) {
  const res = await gemini().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: 16000,
      abortSignal: signal,
    },
  });

  const text = res.text ?? "";
  const finish = res.candidates?.[0]?.finishReason ?? "";
  if (!text && res.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the request (${res.promptFeedback.blockReason})`);
  }
  if (log != null) {
    log.inputTokens += res.usageMetadata?.promptTokenCount ?? 0;
    log.outputTokens += res.usageMetadata?.candidatesTokenCount ?? 0;
    log.stopReason = String(finish);
    log.rawText = text;
  }
  return text;
}

// The answer should be JSON, but may have extra words or ``` around it.
// Grab everything from the first { to the last } and parse that.
export function pullJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start == -1 || end == -1) {
    return null;
  }
  try {
    return JSON.parse(text.substring(start, end + 1));
  } catch {
    return null;
  }
}
