"use client";
// The Contact Book page: filter chips, the contact list and the detail panel.
// Notes autosave (debounced), Mark contacted and Remove are all optimistic.
// Remove waits for the 4-second Undo toast to expire before deleting on the server.
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { removeContact, updateContact } from "@/actions/contacts.actions";
import { AnimatedTitle } from "@/components/shared/AnimatedTitle";
import { Header } from "@/components/shared/Header";
import { ArrowRightIcon } from "@/components/shared/icons";
import { Toast, type ToastMessage } from "@/components/shared/Toast";
import { todayISO } from "@/lib/dates";
import type { Contact } from "@/types";
import { ContactDetail, type NotesStatus } from "./ContactDetail";
import { ContactList } from "./ContactList";
import { FilterChips, type ContactFilter } from "./FilterChips";

const NOTES_DEBOUNCE_MS = 700;
const UNDO_MS = 4000;

const firstName = (c: Contact) => c.full_name.split(/\s+/)[0];
const isNew = (c: Contact) => !c.last_contacted;

type PendingRemoval = { contact: Contact; index: number; timer: ReturnType<typeof setTimeout> | null };

export function ContactBook({ initialContacts }: { initialContacts: Contact[] }) {
  const reduce = useReducedMotion();
  const [contacts, setContacts] = useState(initialContacts);
  const [filter, setFilter] = useState<ContactFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialContacts[0]?.id ?? null);
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

  const patchLocal = (id: string, changes: Partial<Contact>) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));

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
    [],
  );

  function onNotesChange(id: string, value: string) {
    patchLocal(id, { notes: value });
    setNotesStatus((s) => ({ ...s, [id]: "saving" }));
    noteDrafts.current.set(id, value);
    clearTimeout(noteTimers.current.get(id));
    noteTimers.current.set(id, setTimeout(() => saveNotes(id), NOTES_DEBOUNCE_MS));
  }

  // ---------- Mark contacted ----------

  async function markContacted(contact: Contact) {
    const previous = contact.last_contacted;
    const today = todayISO();
    patchLocal(contact.id, { last_contacted: today });
    try {
      await updateContact(contact.id, { last_contacted: today });
    } catch {
      patchLocal(contact.id, { last_contacted: previous });
      showError(`Couldn't update ${firstName(contact)}. Try again.`);
    }
  }

  // ---------- Remove with Undo ----------

  const commitRemoval = useCallback(
    (removal: PendingRemoval) => {
      if (removal.timer) clearTimeout(removal.timer);
      if (pending.current === removal) pending.current = null;
      setToast((t) => (t?.action ? null : t));
      removeContact(removal.contact.id).catch(() => {
        setContacts((prev) => {
          const next = [...prev];
          next.splice(Math.min(removal.index, next.length), 0, removal.contact);
          return next;
        });
        showError(`Couldn't remove ${firstName(removal.contact)}.`);
      });
    },
    [showError],
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
    const index = contacts.findIndex((c) => c.id === contact.id);
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));

    const removal: PendingRemoval = { contact, index, timer: null };
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
    setContacts((prev) => {
      const next = [...prev];
      next.splice(Math.min(removal.index, next.length), 0, removal.contact);
      return next;
    });
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
      <div className="min-h-dvh">
        <Header contactCount={contacts.length} current="contacts" />

        <main className="mx-auto flex max-w-[1160px] flex-col gap-7 px-4 pt-8 pb-32 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <AnimatedTitle
              words={[{ text: "Your" }, { text: "people", accent: true }]}
              className="m-0 text-[clamp(36px,5vw,56px)] leading-none"
            />
            {contacts.length > 0 && <FilterChips value={filter} counts={counts} onChange={setFilter} />}
          </div>

          {contacts.length > 0 ? (
            <div ref={bodyRef} className="flex flex-wrap items-start gap-6">
              <ContactList contacts={visible} selectedId={selected?.id ?? null} onSelect={select} />
              <div ref={panelRef} className="min-w-0 flex-[999_1_560px] scroll-mt-4">
                <AnimatePresence mode="wait">
                  {selected && (
                    <ContactDetail
                      key={selected.id}
                      contact={selected}
                      notesStatus={notesStatus[selected.id] ?? "idle"}
                      onNotesChange={(value) => onNotesChange(selected.id, value)}
                      onMarkContacted={() => markContacted(selected)}
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
              <p className="m-0 font-serif text-[34px] text-ink italic">No one saved yet</p>
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
