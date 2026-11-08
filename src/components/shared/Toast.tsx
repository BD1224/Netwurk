"use client";
// Black toast that springs up from the bottom, with an optional action button (e.g. Undo).
// The live region is always mounted so screen readers announce each new message.
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";

export type ToastMessage = {
  id: number;
  text: string;
  tone: "success" | "error" | "plain";
  action?: { label: string; onClick: () => void };
};

type Props = {
  toast: ToastMessage | null;
  /** Called with true while the pointer or focus is on the toast, so callers can pause its timer. */
  onHoldChange?: (held: boolean) => void;
};

export function Toast({ toast, onHoldChange }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex min-h-12 items-center gap-2.5 rounded-full bg-ink py-1.5 text-[15px] font-medium text-white shadow-[0_20px_50px_-10px_rgba(9,9,11,0.45)]",
              toast.tone === "plain" ? "pl-5" : "pl-2",
              toast.action ? "pr-1.5" : "pr-5",
            )}
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            onPointerEnter={() => onHoldChange?.(true)}
            onPointerLeave={() => onHoldChange?.(false)}
            onFocus={() => onHoldChange?.(true)}
            onBlur={() => onHoldChange?.(false)}
          >
            {toast.tone !== "plain" && (
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  toast.tone === "success" ? "bg-accent" : "bg-[#B91C1C]",
                )}
              >
                {toast.tone === "success" ? <CheckIcon size={16} /> : <span className="text-sm font-bold">!</span>}
              </span>
            )}
            <span className="mr-1">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="h-11 rounded-full bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-soft"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
