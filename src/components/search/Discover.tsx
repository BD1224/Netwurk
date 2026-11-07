"use client";
// The Discover page: idle -> searching -> results.
// Owns the filter values, saved-card state, contact count and toast; useSearch owns the stream.
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { saveContact } from "@/actions/contacts.actions";
import { Header } from "@/components/shared/Header";
import { Toast, type ToastMessage } from "@/components/shared/Toast";
import { useSearch } from "@/hooks/useSearch";
import { SEARCH_STEPS, type PersonProfile, type SearchCriteria } from "@/types";
import { EMPTY_FILTERS, FilterBar, type FilterValues } from "./FilterBar";
import { Headline } from "./Headline";
import { NetworkBackground, type NetworkMode } from "./NetworkBackground";
import { FOUND, FOUND_PER_STEP } from "./network-data";
import { PersonCard } from "./PersonCard";
import { ResultsHeader } from "./ResultsHeader";
import { SearchSteps } from "./SearchSteps";
import { SkeletonCard } from "./SkeletonCard";

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export function Discover({ initialContactCount }: { initialContactCount: number }) {
  const search = useSearch();
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [saved, setSaved] = useState<Set<number>>(() => new Set());
  const [contactCount, setContactCount] = useState(initialContactCount);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const wide = useMediaQuery("(min-width: 860px)");

  const phase: NetworkMode =
    search.people.length > 0 || search.status === "done"
      ? "results"
      : search.status === "running"
        ? "searching"
        : "idle";

  const stepsDone = Math.max(0, Math.min(search.step, SEARCH_STEPS.length));
  const foundCount = phase === "idle" ? 0 : Math.min(stepsDone * FOUND_PER_STEP, FOUND.length);

  // Placeholder slots for people still being researched.
  const skeletons = search.running ? Math.max(0, (search.total ?? search.people.length + 3) - search.people.length) : 0;

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
    const criteria: SearchCriteria = {};
    for (const [key, value] of Object.entries(filters) as [keyof FilterValues, string][]) {
      if (value.trim()) criteria[key] = value.trim();
    }
    setSaved(new Set());
    search.runSearch(criteria);
  }

  function newSearch() {
    search.reset();
    setSaved(new Set());
    setFilters(EMPTY_FILTERS);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }

  // Optimistic save: update the UI first, roll back if the server action fails.
  async function save(index: number, person: PersonProfile) {
    if (saved.has(index)) return;
    const firstName = person.full_name.split(/\s+/)[0];
    setSaved((prev) => new Set(prev).add(index));
    setContactCount((c) => c + 1);
    showToast(`${firstName} added to contacts`);
    try {
      await saveContact(person);
    } catch {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      setContactCount((c) => c - 1);
      showToast(`Couldn't save ${firstName}. Try again.`, "error");
    }
  }

  const topPadding = useMemo(() => (phase === "results" ? 20 : wide ? 180 : 72), [phase, wide]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh overflow-x-clip">
        <NetworkBackground mode={phase} foundCount={foundCount} />
        <Header contactCount={contactCount} />

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
              {phase === "idle" && !search.error && (
                <motion.p key="hint" {...fade} className="text-center text-[15px] text-muted">
                  Fill any field. Our agent searches the web for matching people.
                </motion.p>
              )}
              {phase === "idle" && search.error && (
                <motion.p key="error" {...fade} role="alert" className="text-center text-[15px] text-[#B91C1C]">
                  {search.error}
                </motion.p>
              )}
              {phase === "searching" && (
                <motion.div key="steps" {...fade}>
                  <SearchSteps current={search.step} />
                </motion.div>
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
                  {search.people.map((person, i) => (
                    <li key={i}>
                      <PersonCard person={person} saved={saved.has(i)} onSave={() => save(i, person)} />
                    </li>
                  ))}
                  {Array.from({ length: skeletons }, (_, i) => (
                    <li key={`skeleton-${i}`}>
                      <SkeletonCard />
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.main>

        <Toast toast={toast} />
      </div>
    </MotionConfig>
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
