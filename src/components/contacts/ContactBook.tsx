"use client";
// The /contacts page: filter chips, the contact list and the detail panel.
// The list comes from ContactsProvider (shared with /search). On top of it this page keeps
// quick local changes so the UI never waits on Supabase:
//   notes   - shown as typed, saved after a short pause (debounced)
//   status  - shown at once, rolled back if the save fails
//   remove  - hidden at once, deleted only after the 4-second Undo toast expires
// Repos + papers for the selected contact come from usePersonDetails; the first papers lookup
// saves the contact's OpenAlex id (or "none") so matching only happens once.
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { NetworkBackground } from "@/components/search/NetworkBackground";
import { AnimatedTitle } from "@/components/shared/AnimatedTitle";
import { Header } from "@/components/shared/Header";
import { ArrowRightIcon, Spinner } from "@/components/shared/icons";
import { Toast, type ToastMessage } from "@/components/shared/Toast";
import { usePersonDetails } from "@/hooks/usePersonDetails";
import { useSignOut } from "@/hooks/useSignOut";
import type { Contact, ContactStatus } from "@/types";
import { ContactDetail, type NotesStatus } from "./ContactDetail";
import { useContactBook } from "./ContactsProvider";
import { ContactList } from "./ContactList";
import { FilterChips, type ContactFilter } from "./FilterChips";

const NOTES_DEBOUNCE_MS = 700;
const UNDO_MS = 4000;

const firstName = (c: Contact) => c.fullName.split(/\s+/)[0];
const isNew = (c: Contact) => c.status === "to_contact";

type PendingRemoval = { contact: Contact; timer: ReturnType<typeof setTimeout> | null };

export function ContactBook() {
  const reduce = useReducedMotion();
  const book = useContactBook();
  const signOut = useSignOut();
  // Local changes layered over the shared list (see the top of the file).
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  const [statusEdits, setStatusEdits] = useState<Record<string, ContactStatus>>({});
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const contacts = book.contacts
    .filter((c) => !hidden.has(c.id))
    .map((c) => ({ ...c, notes: noteEdits[c.id] ?? c.notes, status: statusEdits[c.id] ?? c.status }));

  const [filter, setFilter] = useState<ContactFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesStatus, setNotesStatus] = useState<Record<string, NotesStatus>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const noteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const noteDrafts = useRef(new Map<string, string>());
  const pending = useRef<PendingRemoval | null>(null);
  const toastSeq = useRef(0);

  const counts = {
    all: contacts.length,
    new: contacts.filter(isNew).length,
    done: contacts.filter((c) => !isNew(c)).length,
  };
  const visible = contacts.filter((c) => filter === "all" || (filter === "new" ? isNew(c) : !isNew(c)));
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  const { updateContact, removeContact } = book;
  const details = usePersonDetails(selected?.id ?? null, selected, {
    openalexId: selected?.openalexId,
    onMatched: (openalexId) => {
      if (selected) updateContact(selected.id, { openalexId }).catch(() => {}); // retried next visit
    },
  });

  const unhide = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const showError = useCallback(
    (text: string) => setToast({ id: ++toastSeq.current, text, tone: "error" }),
    [],
  );

  // Non-action toasts (errors) hide themselves; the Undo toast is timed by the removal.
  useEffect(() => {
    if (!toast || toast.action) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- Notes: optimistic + debounced save ----------

  const saveNotes = useCallback(
    (id: string) => {
      noteTimers.current.delete(id);
      const value = noteDrafts.current.get(id) ?? "";
      noteDrafts.current.delete(id);
      updateContact(id, { notes: value.trim() ? value : null })
        .then(() => setNotesStatus((s) => ({ ...s, [id]: noteDrafts.current.has(id) ? "saving" : "saved" })))
        .catch(() => setNotesStatus((s) => ({ ...s, [id]: "error" })));
    },
    [updateContact],
  );

  function onNotesChange(id: string, value: string) {
    setNoteEdits((n) => ({ ...n, [id]: value }));
    setNotesStatus((s) => ({ ...s, [id]: "saving" }));
    noteDrafts.current.set(id, value);
    clearTimeout(noteTimers.current.get(id));
    noteTimers.current.set(id, setTimeout(() => saveNotes(id), NOTES_DEBOUNCE_MS));
  }

  // ---------- Status ----------

  async function changeStatus(contact: Contact, status: ContactStatus) {
    const forget = () =>
      setStatusEdits((s) => {
        const { [contact.id]: _, ...rest } = s;
        return rest;
      });
    setStatusEdits((s) => ({ ...s, [contact.id]: status }));
    try {
      await updateContact(contact.id, { status });
      forget(); // the shared list has the new status now
    } catch {
      forget(); // back to the saved status
      showError(`Couldn't update ${firstName(contact)}. Try again.`);
    }
  }

  // ---------- Remove with Undo ----------

  const commitRemoval = useCallback(
    (removal: PendingRemoval) => {
      if (removal.timer) clearTimeout(removal.timer);
      if (pending.current === removal) pending.current = null;
      setToast((t) => (t?.action ? null : t));
      // On success the shared list drops it; on failure show it again.
      removeContact(removal.contact.id).catch(() => {
        unhide(removal.contact.id);
        showError(`Couldn't remove ${firstName(removal.contact)}.`);
      });
    },
    [removeContact, showError],
  );

  const startUndoTimer = useCallback(
    (removal: PendingRemoval) => {
      if (removal.timer) clearTimeout(removal.timer);
      removal.timer = setTimeout(() => commitRemoval(removal), UNDO_MS);
    },
    [commitRemoval],
  );

  function remove(contact: Contact) {
    if (pending.current) commitRemoval(pending.current); // only one undo at a time
    setHidden((prev) => new Set(prev).add(contact.id));

    const removal: PendingRemoval = { contact, timer: null };
    pending.current = removal;
    startUndoTimer(removal);
    setToast({
      id: ++toastSeq.current,
      text: `${firstName(contact)} removed`,
      tone: "plain",
      action: { label: "Undo", onClick: () => undo(removal) },
    });
  }

  function undo(removal: PendingRemoval) {
    if (pending.current !== removal) return;
    if (removal.timer) clearTimeout(removal.timer);
    pending.current = null;
    unhide(removal.contact.id);
    setSelectedId(removal.contact.id);
    setToast(null);
  }

  // Hovering or focusing the Undo toast pauses the countdown.
  function onToastHold(held: boolean) {
    const removal = pending.current;
    if (!removal) return;
    if (held && removal.timer) {
      clearTimeout(removal.timer);
      removal.timer = null;
    } else if (!held) {
      startUndoTimer(removal);
    }
  }

  // Leaving the page: save unsaved notes and finish a pending removal.
  useEffect(() => {
    const timers = noteTimers.current;
    return () => {
      for (const id of [...timers.keys()]) {
        clearTimeout(timers.get(id));
        saveNotes(id);
      }
      if (pending.current) commitRemoval(pending.current);
    };
  }, [saveNotes, commitRemoval]);

  // ---------- Selection ----------

  function select(id: string, via: "click" | "keyboard") {
    setSelectedId(id);
    // On phones the panel sits below the list: bring it into view after a tap.
    const list = bodyRef.current?.firstElementChild;
    const panelEl = panelRef.current;
    if (via === "click" && list && panelEl) {
      const stacked = panelEl.getBoundingClientRect().top >= list.getBoundingClientRect().bottom - 1;
      if (stacked) panelEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh overflow-x-clip">
        {/* Same network background as Discover, faded like it is behind search results. */}
        <NetworkBackground mode="results" foundCount={0} />
        <Header contactCount={contacts.length} current="contacts" onSignOut={signOut} />

        <main className="relative z-10 mx-auto flex max-w-[1160px] flex-col gap-7 px-4 pt-8 pb-32 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <AnimatedTitle
              words={[{ text: "Your" }, { text: "people", accent: true }]}
              className="m-0 text-[clamp(36px,5vw,56px)] leading-none"
            />
            {contacts.length > 0 && <FilterChips value={filter} counts={counts} onChange={setFilter} />}
          </div>

          {book.loading ? (
            <div role="status" className="flex items-center justify-center gap-2.5 py-24 text-[15px] text-muted">
              <Spinner size={16} className="text-accent" />
              Loading your contacts…
            </div>
          ) : book.error && book.contacts.length === 0 ? (
            <p role="alert" className="py-24 text-center text-[15px] text-[#B91C1C]">
              Couldn&apos;t load your contacts: {book.error}
            </p>
          ) : contacts.length > 0 ? (
            <div ref={bodyRef} className="flex flex-wrap items-start gap-6">
              <ContactList contacts={visible} selectedId={selected?.id ?? null} onSelect={select} />
              <div ref={panelRef} className="min-w-0 flex-[999_1_560px] scroll-mt-4">
                <AnimatePresence mode="wait">
                  {selected && (
                    <ContactDetail
                      key={selected.id}
                      contact={selected}
                      notesStatus={notesStatus[selected.id] ?? "idle"}
                      repos={details?.repos ?? "loading"}
                      papers={details?.papers ?? "loading"}
                      onNotesChange={(value) => onNotesChange(selected.id, value)}
                      onStatusChange={(status) => changeStatus(selected, status)}
                      onRemove={() => remove(selected)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <motion.div
              className="flex flex-col items-center gap-4 px-6 py-24 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.9, 0.1, 1] }}
            >
              <p className="m-0 text-2xl font-semibold text-ink">No one saved yet</p>
              <Link
                href="/search"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-[22px] text-[15px] font-medium text-white transition-[transform,background-color] duration-200 hover:scale-[1.04] hover:bg-accent motion-reduce:hover:scale-100"
              >
                Find people
                <ArrowRightIcon size={16} />
              </Link>
            </motion.div>
          )}
        </main>

        <Toast toast={toast} onHoldChange={onToastHold} />
      </div>
    </MotionConfig>
  );
}
