"use client";
// Browser-side React hook used by the Discover page.
// runSearch(criteria) POSTs to /api/search and reads the NDJSON stream (one SearchEvent per line),
// tracking step progress and adding each person to `people` as they arrive.
import { useCallback, useEffect, useRef, useState } from "react";
import { SEARCH_STEPS, SearchEventSchema, type SearchCriteria, type SearchPerson } from "@/types";

export type SearchStatus = "idle" | "running" | "done" | "error";

export function useSearch() {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [people, setPeople] = useState<SearchPerson[]>([]);
  /** Index of the running step; steps before it are done. SEARCH_STEPS.length = all done. -1 = not started. */
  const [step, setStep] = useState(-1);
  /** Number of candidates being researched, once the agent knows it. */
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel an in-flight search when the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setPeople([]);
    setStep(-1);
    setTotal(null);
    setError(null);
  }, []);

  const runSearch = useCallback(async (criteria: SearchCriteria) => {
    abortRef.current?.abort(); // a new search replaces the previous one
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrent = () => abortRef.current === controller;

    setStatus("running");
    setPeople([]);
    setStep(-1);
    setTotal(null);
    setError(null);

    // Applies one NDJSON line. Returns true when the stream is finished.
    const handleLine = (line: string): boolean => {
      if (!line.trim()) return false;
      let json: unknown;
      try {
        json = JSON.parse(line);
      } catch {
        return false; // skip malformed lines
      }
      const parsed = SearchEventSchema.safeParse(json);
      if (!parsed.success) return false;

      const event = parsed.data;
      switch (event.type) {
        case "step":
          setStep(event.step);
          return false;
        case "found":
          setTotal(event.count);
          return false;
        case "person":
          setPeople((prev) => [...prev, event.person]);
          return false;
        case "done":
          setStep(SEARCH_STEPS.length);
          setStatus("done");
          return true;
        case "error":
          setError(event.message);
          setStatus("error");
          return true;
      }
    };

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Search failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep the partial last line for the next chunk
        for (const line of lines) {
          if (handleLine(line)) {
            finished = true;
            break;
          }
        }
      }
      if (!finished) finished = handleLine(buffer + decoder.decode());
      if (finished) await reader.cancel();
      else if (isCurrent()) {
        // Stream ended without a done/error event.
        setStep(SEARCH_STEPS.length);
        setStatus("done");
      }
    } catch (err) {
      if (controller.signal.aborted) return; // replaced, reset or unmounted: not an error
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    }
  }, []);

  return { runSearch, reset, status, running: status === "running", people, step, total, error };
}
