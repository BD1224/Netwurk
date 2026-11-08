"use client";
// Row of step pills under the filter bar: waiting -> running -> done, driven by "step" events.
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SEARCH_STEPS } from "@/types";
import { CheckIcon, Spinner } from "@/components/shared/icons";

/** `current` = index of the running step (steps before it are done); -1 before the first event. */
export function SearchSteps({ current }: { current: number }) {
  const status =
    current >= SEARCH_STEPS.length
      ? "All steps done"
      : current >= 0
        ? `Step ${current + 1} of ${SEARCH_STEPS.length}: ${SEARCH_STEPS[current]}`
        : "Starting search";

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3" aria-label="Search progress">
        {SEARCH_STEPS.map((label, i) => {
          const state = i < current ? "done" : i === current ? "running" : "waiting";
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-[#A1A1AA]">
                  →
                </span>
              )}
              <motion.span
                layout
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-300",
                  state === "waiting" && "border-line bg-surface text-muted",
                  state === "running" && "border-ink bg-ink text-white",
                  state === "done" && "border-line bg-soft text-ink",
                )}
              >
                {state === "waiting" && <span className="size-1.5 rounded-full bg-[#A1A1AA]" aria-hidden="true" />}
                {state === "running" && <Spinner size={14} />}
                {state === "done" && (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 18 }}
                    className="grid"
                  >
                    <CheckIcon size={14} strokeWidth={3} />
                  </motion.span>
                )}
                {label}
                <span className="sr-only">
                  {state === "done" ? " (done)" : state === "running" ? " (in progress)" : " (waiting)"}
                </span>
              </motion.span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
