"use client";
// The saved-people list. Up/Down arrows (and Home/End) move the selection and focus.
import { AnimatePresence } from "motion/react";
import { useRef } from "react";
import type { Contact } from "@/types";
import { ContactRow } from "./ContactRow";

type Props = {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string, via: "click" | "keyboard") => void;
};

export function ContactList({ contacts, selectedId, onSelect }: Props) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      e.key === "ArrowDown"
        ? Math.min(index + 1, contacts.length - 1)
        : e.key === "ArrowUp"
          ? Math.max(index - 1, 0)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? contacts.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    const id = contacts[next].id;
    onSelect(id, "keyboard");
    buttons.current.get(id)?.focus();
  }

  return (
    <ul aria-label="Saved people" className="m-0 flex max-w-full flex-[1_1_300px] list-none flex-col gap-1 p-0">
      <AnimatePresence initial>
        {contacts.map((c, i) => (
          <ContactRow
            key={c.id}
            ref={(el) => {
              if (el) buttons.current.set(c.id, el);
              else buttons.current.delete(c.id);
            }}
            contact={c}
            index={i}
            selected={c.id === selectedId}
            onSelect={() => onSelect(c.id, "click")}
            onKeyDown={(e) => onKeyDown(e, i)}
          />
        ))}
      </AnimatePresence>
      {contacts.length === 0 && <li className="px-3.5 py-7 text-sm text-subtle">Nobody here yet.</li>}
    </ul>
  );
}
