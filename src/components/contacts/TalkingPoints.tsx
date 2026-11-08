"use client";
// Indigo box listing talking points (newline-separated text), with a Copy button
// that swaps to a "Copied" chip for 1.6s.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/shared/icons";

export function TalkingPoints({ text }: { text: string }) {
  const points = text
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(points.join("\n"));
      setCopied(true);
    } catch {
      // Clipboard blocked (e.g. insecure context): leave the button as is.
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[22px] bg-accent-soft px-6 py-[22px]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-lg font-semibold text-ink">
          Talking points
        </h3>
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              role="status"
              className="flex h-11 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-medium text-white"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: [0.4, 1.15, 1] }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <CheckIcon size={14} strokeWidth={2.5} />
              Copied
            </motion.span>
          ) : (
            <motion.button
              key="copy"
              type="button"
              onClick={copy}
              className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <CopyIcon size={14} />
              Copy<span className="sr-only"> talking points</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] leading-normal text-ink">
            <span aria-hidden="true" className="mt-[9px] size-1.5 flex-none rounded-full bg-accent" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
