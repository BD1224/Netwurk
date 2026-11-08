"use client";
// The Discover page: idle -> searching -> results.
// Owns the saved-card state, contact count and toast. The search itself (filters, results,
// progress) lives in SearchSession, so it's still here after a trip to Contacts.
// Clicking a card opens the details overlay and adds ?person={id} to the URL (shallow), so
// Back closes it and the link can be shared.
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { saveContact } from "@/actions/contacts.actions";
import { Header } from "@/components/shared/Header";
import { Toast, type ToastMessage } from "@/components/shared/Toast";
import { usePersonDetails } from "@/hooks/usePersonDetails";
import { SEARCH_STEPS, type SearchCriteria, type SearchPerson } from "@/types";
import { EMPTY_FILTERS, FilterBar, type FilterValues } from "./FilterBar";
import { Headline } from "./Headline";
import { NetworkBackground, type NetworkMode } from "./NetworkBackground";
import { FOUND, FOUND_PER_STEP } from "./network-data";
import { PersonCard } from "./PersonCard";
import { PersonDialog } from "./PersonDialog";
import { ResultsHeader } from "./ResultsHeader";
import { useSearchSession } from "./SearchSession";
import { SearchSteps } from "./SearchSteps";
import { SkeletonCard } from "./SkeletonCard";

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

type Props = {
  initialContactCount: number;
  /** Search-result ids already in the contact book (from the server). */
  initialSavedIds: string[];
};

export function Discover({ initialContactCount, initialSavedIds }: Props) {
  const { search, filters, setFilters } = useSearchSession();
  // Saved = already in the contact book, so it carries across searches and page visits.
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initialSavedIds));
  const [contactCount, setContactCount] = useState(initialContactCount);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const wide = useMediaQuery("(min-width: 860px)");

  // ---------- Details overlay, driven by ?person={id} ----------
  const openId = useSearchParams().get("person");
  const resultPerson = search.people.find((p) => p.id === openId) ?? null;
  const details = usePersonDetails(openId, resultPerson);
  // From the results if we have them; a shared link with no results waits for the details.
  const openPerson =
    search.people.find((p) => p.id === openId) ?? (details?.status === "ready" ? details.data.person : null);
  // True when this page added the ?person entry, so closing can just go Back.
  const pushedRef = useRef(false);

  function openDetails(person: SearchPerson) {
    const params = new URLSearchParams(window.location.search);
    params.set("person", person.id);
    window.history.pushState(null, "", `?${params}`);
    pushedRef.current = true;
  }

  const closeDetails = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("person");
    window.history.replaceState(null, "", params.size ? `?${params}` : window.location.pathname);
  }, []);

  // A link to someone we can't find (e.g. an old search): drop the param.
  const missing = openId !== null && !openPerson && details?.status === "error";
  useEffect(() => {
    if (missing) closeDetails();
  }, [missing, closeDetails]);

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
    search.runSearch(criteria);
  }

  function newSearch() {
    search.reset();
    setFilters(EMPTY_FILTERS);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }

  // Optimistic save: update the UI first, roll back if the server action fails.
  async function save(person: SearchPerson) {
    if (saved.has(person.id)) return;
    const firstName = person.full_name.split(/\s+/)[0];
    setSaved((prev) => new Set(prev).add(person.id));
    setContactCount((c) => c + 1);
    showToast(`${firstName} added to contacts`);
    try {
      await saveContact(person);
    } catch {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(person.id);
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
                  {search.people.map((person) => (
                    <li key={person.id} className="flex">
                      <PersonCard
                        person={person}
                        saved={saved.has(person.id)}
                        onSave={() => save(person)}
                        onOpen={() => openDetails(person)}
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
          details={details}
          saved={openPerson ? saved.has(openPerson.id) : false}
          onSave={save}
          onClose={closeDetails}
        />

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
