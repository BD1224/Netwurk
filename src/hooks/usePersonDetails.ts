"use client";
// Loads GET /api/people/[id]/details for the open Discover overlay.
// Results are kept per id, so reopening someone is instant.
import { useEffect, useState } from "react";
import { PersonDetailsSchema, type PersonDetails } from "@/types";

export type DetailsState =
  | { status: "loading" }
  | { status: "ready"; data: PersonDetails }
  | { status: "error" };

const LOADING: DetailsState = { status: "loading" };

export function usePersonDetails(id: string | null): DetailsState | null {
  const [results, setResults] = useState<Record<string, DetailsState>>({});
  const known = id ? results[id] : undefined;

  useEffect(() => {
    if (!id || known) return;
    const controller = new AbortController();
    fetch(`/api/people/${encodeURIComponent(id)}/details`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = PersonDetailsSchema.parse(await res.json());
        setResults((r) => ({ ...r, [id]: { status: "ready", data } }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults((r) => ({ ...r, [id]: { status: "error" } }));
      });
    return () => controller.abort();
  }, [id, known]);

  return id ? (known ?? LOADING) : null;
}
