"use client";
// Browser-side React hook for the search. POSTs SearchCriteria to /api/search (the server,
// which holds the secret AI key) and reads the stream, adding each person to `people`.
// Returns { runSearch(criteria), reset(), people: SearchResult[], found, running, searched, error }.
// Each person gets a browser-made `key` (for lists and "saved" tracking).
// found = how many candidates are being researched (null until the server says).
// searched = a search has been started since the last reset (false = nothing to show yet).
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchCriteria, SearchEvent, SearchResult } from "@/types";

// Names of people already shown in this browser, sent with each search so the server finds new
// people. Kept in localStorage (last 300); if storage is unavailable, searches just don't exclude.
const SEEN_KEY = "nf:seen-people";
const MAX_SEEN = 300;

function seenNames(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(-MAX_SEEN) : [];
  } catch {
    return [];
  }
}

function rememberSeen(name: string) {
  try {
    const names = seenNames().filter((n) => n !== name);
    names.push(name);
    localStorage.setItem(SEEN_KEY, JSON.stringify(names.slice(-MAX_SEEN)));
  } catch {
    // storage blocked: nothing to remember
  }
}

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
        rememberSeen(event.person.fullName);
      }
      if (event.type === "error") setError(event.message);
    };

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...criteria, exclude: seenNames() }),
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
