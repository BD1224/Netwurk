"use client";
// Browser-side React hook for the search. POSTs SearchCriteria to /api/search (the server,
// which holds the secret Claude key) and reads the stream, adding each person to `people`.
// Returns { runSearch(criteria), reset(), people: SearchResult[], found, running, searched, error }.
// Each person gets a browser-made `key` (for lists and "saved" tracking).
// found = how many candidates are being researched (null until the server says).
// searched = a search has been started since the last reset (false = nothing to show yet).
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchCriteria, SearchEvent, SearchResult } from "@/types";

export function useSearch() {
  const [people, setPeople] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // stop an in-flight search when the page closes
  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPeople([]);
    setFound(null);
    setRunning(false);
    setSearched(false);
    setError(null);
  }, []);

  const runSearch = useCallback(async (criteria: SearchCriteria) => {
    abortRef.current?.abort(); // a new search replaces the old one
    const controller = new AbortController();
    abortRef.current = controller;
    setPeople([]);
    setFound(null);
    setError(null);
    setRunning(true);
    setSearched(true);

    // handles one line of the stream
    const handle = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as SearchEvent;
      if (event.type === "found") setFound(event.count);
      if (event.type === "person") {
        setPeople((prev) => [...prev, { ...event.person, key: crypto.randomUUID() }]);
      }
      if (event.type === "error") setError(event.message);
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
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // last piece may be a half-sent line
        lines.forEach(handle);
      }
      handle(buffer);
    } catch (e) {
      if (controller.signal.aborted) return; // replaced or page closed: not an error
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (abortRef.current === controller) setRunning(false);
    }
  }, []);

  return { runSearch, reset, people, found, running, searched, error };
}
