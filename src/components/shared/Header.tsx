"use client";
// Top bar, right-aligned:
//   Search   - a "Contacts" pill with a count badge
//   Contacts - a pill switch [Discover | Contacts (count)] with Contacts active, and a Log out button
//   Sign in  - nothing (leave out contactCount)
// The count badge bounces whenever the count changes.
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

type Props = { contactCount?: number; current?: "search" | "contacts"; onSignOut?: () => void };

export function Header({ contactCount, current = "search", onSignOut }: Props) {
  return (
    <header className="relative z-10 mx-auto flex h-[84px] w-full max-w-[1160px] items-center justify-end gap-4 px-4 sm:px-6">
      {contactCount === undefined ? null : current === "search" ? (
        <Link
          href="/contacts"
          className="flex h-11 items-center gap-3 rounded-full border border-line bg-surface pr-1.5 pl-5 text-[15px] font-medium shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-colors hover:border-[#D4D4D8]"
          aria-label={`Contacts, ${contactCount} saved`}
        >
          Contacts
          <CountBadge count={contactCount} />
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <nav aria-label="App" className="flex gap-1 rounded-full border border-line bg-surface p-1">
            <Link
              href="/search"
              className="flex h-11 items-center rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
            >
              Discover
            </Link>
            <Link
              href="/contacts"
              aria-current="page"
              aria-label={`Contacts, ${contactCount} saved`}
              className="flex h-11 items-center gap-2 rounded-full bg-ink pr-1.5 pl-4 text-sm font-medium text-white"
            >
              Contacts
              <CountBadge count={contactCount} />
            </Link>
          </nav>
          <button
            type="button"
            onClick={onSignOut}
            className="flex h-[54px] items-center rounded-full border border-line bg-surface px-5 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}

function CountBadge({ count }: { count: number }) {
  // Keyed on the count, so the badge remounts and bounces on every change (not on first load).
  const [initialCount] = useState(count);
  return (
    <motion.span
      key={count}
      className="grid h-8 min-w-8 place-items-center rounded-full bg-accent px-2 font-mono text-sm text-white tabular-nums"
      initial={count === initialCount ? false : { scale: 1.45 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 12 }}
    >
      {count}
    </motion.span>
  );
}
