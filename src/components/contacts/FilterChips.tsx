"use client";
// All · To reach out · Contacted, each with a live count. The active chip is black.
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type ContactFilter = "all" | "new" | "done";

const FILTERS: { key: ContactFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "To reach out" },
  { key: "done", label: "Contacted" },
];

type Props = {
  value: ContactFilter;
  counts: Record<ContactFilter, number>;
  onChange: (value: ContactFilter) => void;
};

export function FilterChips({ value, counts, onChange }: Props) {
  return (
    <motion.div
      role="group"
      aria-label="Show"
      className="flex flex-wrap gap-1.5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.2, 0.9, 0.1, 1] }}
    >
      {FILTERS.map(({ key, label }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full border pr-2 pl-4 text-sm font-medium transition-colors",
              on
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-[#3F3F46] hover:border-[#A1A1AA]",
            )}
          >
            {label}
            <span
              className={cn(
                "inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-xs tabular-nums",
                on ? "bg-white/15" : "bg-soft text-muted",
              )}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}
