"use client";
// Loads /api/people/[id]/details for the open Discover overlay. When the person is in the search
// results it POSTs them (works on any server instance); a shared ?person= link uses GET.
// Results are kept per id, so reopening someone is instant.
import { useEffect, useState } from "react";
import { PersonDetailsSchema, type PersonDetails, type SearchPerson } from "@/types";

export type DetailsState =
  | { status: "loading" }
  | { status: "ready"; data: PersonDetails }
  | { status: "error" };

const LOADING: DetailsState = { status: "loading" };

export function usePersonDetails(id: string | null, person: SearchPerson | null): DetailsState | null {
  const [results, setResults] = useState<Record<string, DetailsState>>({});
  const known = id ? results[id] : undefined;

  useEffect(() => {
    if (!id || known) return;
    const controller = new AbortController();
    const url = `/api/people/${encodeURIComponent(id)}/details`;
    const request: RequestInit =
      person?.id === id
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(person) }
        : { method: "GET" };
    fetch(url, { ...request, signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = PersonDetailsSchema.parse(await res.json());
        setResults((r) => ({ ...r, [id]: { status: "ready", data } }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults((r) => ({ ...r, [id]: { status: "error" } }));
      });
    return () => controller.abort();
    // person is read once per id; a new object for the same id needn't refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, known]);

  return id ? (known ?? LOADING) : null;
}
