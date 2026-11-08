"use client";
// The /search page: idle -> searching -> results.
// The search itself (filters, results) lives in SearchSession and the contact book in
// ContactsProvider, so both survive a trip to /contacts. Clicking a card opens PersonDialog,
// whose repos + papers come from usePersonDetails.
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useContactBook } from "@/components/contacts/ContactsProvider";
import { Header } from "@/components/shared/Header";
import { Spinner } from "@/components/shared/icons";
import { Toast, type ToastMessage } from "@/components/shared/Toast";
import { usePersonDetails } from "@/hooks/usePersonDetails";
import { useSignOut } from "@/hooks/useSignOut";
import type { Contact, PersonProfile, SearchCriteria, SearchResult } from "@/types";
import { EMPTY_FILTERS, FilterBar, type FilterField, type FilterValues } from "./FilterBar";
import { Headline } from "./Headline";
import { NetworkBackground, type NetworkMode } from "./NetworkBackground";
import { FOUND } from "./network-data";
import { PersonCard } from "./PersonCard";
import { PersonDialog } from "./PersonDialog";
import { ResultsHeader } from "./ResultsHeader";
import { useSearchSession } from "./SearchSession";
import { SkeletonCard } from "./SkeletonCard";

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export function Discover() {
  const { search, filters, setFilters } = useSearchSession();
  const { contacts, saveContact } = useContactBook();
  const signOut = useSignOut();
  // Results saved during this visit, before (or in case) the contact list catches up.
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const wide = useMediaQuery("(min-width: 860px)");

  const isSaved = useCallback(
    (person: SearchResult) => pending.has(person.key) || contacts.some((c) => samePerson(person, c)),
    [pending, contacts],
  );
  // Optimistic count: saved contacts plus saves still on their way.
  const contactCount =
    contacts.length + search.people.filter((p) => pending.has(p.key) && !contacts.some((c) => samePerson(p, c))).length;

  // ---------- Details overlay ----------
  const openPerson = search.people.find((p) => p.key === openKey) ?? null;
  const details = usePersonDetails(openKey, openPerson);

  // ---------- Phase + animation ----------
  const phase: NetworkMode =
    search.people.length > 0 || (search.searched && !search.running)
      ? "results"
      : search.running
        ? "searching"
        : "idle";
  // Light up one background avatar per candidate found.
  const foundCount = phase === "searching" ? Math.min(search.found ?? 0, FOUND.length) : 0;
  // Placeholder slots for people still being researched.
  const skeletons = search.running
    ? Math.max(0, (search.found ?? search.people.length + 3) - search.people.length)
    : 0;

  // Hide the toast after a moment.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((text: string, tone: ToastMessage["tone"] = "success") => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  function submit() {
    setOpenKey(null);
    search.runSearch(toCriteria(filters));
  }

  function newSearch() {
    setOpenKey(null);
    search.reset();
    setFilters(EMPTY_FILTERS);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }

  // Optimistic save: update the UI first, roll back if Supabase says no.
  async function save(person: SearchResult) {
    if (isSaved(person)) return;
    const firstName = person.fullName.split(/\s+/)[0];
    setPending((prev) => new Set(prev).add(person.key));
    showToast(`${firstName} added to contacts`);
    try {
      const { key: _key, ...profile } = person;
      await saveContact(profile);
    } catch {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(person.key);
        return next;
      });
      showToast(`Couldn't save ${firstName}. Try again.`, "error");
    }
  }

  const topPadding = useMemo(() => (phase === "results" ? 20 : wide ? 180 : 72), [phase, wide]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh overflow-x-clip">
        <NetworkBackground mode={phase} foundCount={foundCount} />
        <Header contactCount={contactCount} onSignOut={signOut} />

        <motion.main
          className="relative z-10 mx-auto w-full max-w-[1072px] px-4 pb-28"
          initial={false}
          animate={{ paddingTop: topPadding }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        >
          <AnimatePresence initial={false}>
            {phase !== "results" && (
              <motion.div
                key="headline"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="pt-2 pb-9">
                  <Headline />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FilterBar
            values={filters}
            onChange={setFilters}
            onSubmit={submit}
            running={search.running}
            inputRef={firstFieldRef}
          />

          <div className="mt-6 flex min-h-9 justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "idle" && search.error && (
                <motion.p key="error" {...fade} role="alert" className="text-center text-[15px] text-[#B91C1C]">
                  {search.error}
                </motion.p>
              )}
              {phase === "searching" && (
                <motion.p
                  key={search.found === null ? "looking" : "researching"}
                  {...fade}
                  role="status"
                  className="flex items-center gap-2.5 text-[15px] text-muted"
                >
                  <Spinner size={16} className="text-accent" />
                  {search.found === null
                    ? "Looking for people who match…"
                    : `Found ${search.found} ${search.found === 1 ? "person" : "people"}. Researching each one…`}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {phase === "results" && (
              <motion.section
                key="results"
                aria-label="Results"
                className="mx-auto mt-6 max-w-[1040px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ResultsHeader count={search.people.length} running={search.running} onNewSearch={newSearch} />

                {search.error && (
                  <p role="alert" className="mt-3 text-[15px] text-[#B91C1C]">
                    {search.error}
                  </p>
                )}
                {!search.running && search.people.length === 0 && !search.error && (
                  <p className="mt-3 text-[15px] text-muted">No matches. Try fewer or broader fields.</p>
                )}

                <ul
                  className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4"
                  style={{ perspective: 1200 }}
                >
                  {search.people.map((person) => (
                    <li key={person.key} className="flex">
                      <PersonCard
                        person={person}
                        saved={isSaved(person)}
                        onSave={() => save(person)}
                        onOpen={() => setOpenKey(person.key)}
                      />
                    </li>
                  ))}
                  {Array.from({ length: skeletons }, (_, i) => (
                    <li key={`skeleton-${i}`} className="flex">
                      <SkeletonCard />
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.main>

        <PersonDialog
          person={openPerson}
          repos={details?.repos ?? "loading"}
          papers={details?.papers ?? "loading"}
          saved={openPerson ? isSaved(openPerson) : false}
          onSave={save}
          onClose={() => setOpenKey(null)}
        />

        <Toast toast={toast} />
      </div>
    </MotionConfig>
  );
}

// "Google, Meta" -> ["Google", "Meta"]; empty fields are left out.
function toCriteria(filters: FilterValues): SearchCriteria {
  const criteria: SearchCriteria = {};
  for (const [key, value] of Object.entries(filters) as [FilterField, string][]) {
    const list = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (list.length > 0) criteria[key] = list;
  }
  return criteria;
}

// Is this search result someone already in the contact book? Same LinkedIn, or same name + org.
const norm = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\/+$/, "");
function samePerson(p: PersonProfile, c: Contact) {
  if (p.linkedinUrl && c.linkedinUrl) return norm(p.linkedinUrl) === norm(c.linkedinUrl);
  return (
    norm(p.fullName) === norm(c.fullName) &&
    norm(p.company ?? p.university) === norm(c.company ?? c.university)
  );
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => true, // server render assumes the wide layout
  );
}
