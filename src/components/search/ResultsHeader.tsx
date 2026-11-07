"use client";
// Big serif count that counts up as cards arrive, "people found", and a "New search" button.
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { RotateIcon, Spinner } from "@/components/shared/icons";

type Props = { count: number; running: boolean; onNewSearch: () => void };

export function ResultsHeader({ count, running, onNewSearch }: Props) {
  const label = count === 1 ? "person found" : "people found";

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <p className="flex items-baseline gap-3">
        <CountUp value={count} />
        <span className="text-lg text-muted">{label}</span>
        {running && <Spinner size={16} className="self-center text-subtle" />}
        {/* Announce the total once, when streaming finishes, instead of on every card. */}
        <span className="sr-only" aria-live="polite">
          {running ? "" : `${count} ${label}`}
        </span>
      </p>
      <button
        type="button"
        onClick={onNewSearch}
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-[15px] font-medium transition-colors hover:border-[#D4D4D8] hover:bg-soft"
      >
        <RotateIcon size={16} />
        New search
      </button>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const spring = useSpring(0, { stiffness: 90, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const className = "font-serif text-[64px] leading-none text-ink italic tabular-nums";
  if (reduce) {
    return (
      <span aria-hidden="true" className={className}>
        {value}
      </span>
    );
  }
  return (
    <motion.span aria-hidden="true" className={className}>
      {display}
    </motion.span>
  );
}
