"use client";
// Keeps the Discover search (filter values, results, progress) alive while the user is on
// another page of the app. It lives in the (app) layout, which stays mounted when moving
// between /discover and /contacts, so going back shows the same results, and a search that's
// still running keeps streaming in the meantime. A full page reload still starts fresh.
import { createContext, use, useState } from "react";
import { useSearch } from "@/hooks/useSearch";
import { EMPTY_FILTERS, type FilterValues } from "./FilterBar";

type SearchSession = {
  search: ReturnType<typeof useSearch>;
  filters: FilterValues;
  setFilters: (filters: FilterValues) => void;
};

const SearchSessionContext = createContext<SearchSession | null>(null);

export function SearchSessionProvider({ children }: { children: React.ReactNode }) {
  const search = useSearch();
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  return <SearchSessionContext value={{ search, filters, setFilters }}>{children}</SearchSessionContext>;
}

export function useSearchSession(): SearchSession {
  const session = use(SearchSessionContext);
  if (!session) throw new Error("useSearchSession must be used inside SearchSessionProvider");
  return session;
}
