"use client";
// The sign-in card after the magic link is sent: envelope pops in with a pulsing ring.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { MailIcon } from "@/components/shared/icons";

type Props = { email: string; onUseDifferentEmail: () => void };

export function CheckInbox({ email, onUseDifferentEmail }: Props) {
  const reduce = useReducedMotion();
  // The submit button that had focus is gone; keep keyboard users inside the card.
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus({ preventScroll: true }), []);

  return (
    <div role="status" className="flex flex-col items-center gap-[18px] py-2 text-center">
      <motion.span
        aria-hidden="true"
        className="relative grid size-[84px] place-items-center rounded-full bg-soft text-ink"
        initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 13, delay: 0.1 }}
      >
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-accent-light"
            animate={{ opacity: [0.6, 0], scale: [0.7, 1.8] }}
            transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
          />
        )}
        <MailIcon size={34} strokeWidth={1.8} />
      </motion.span>
      <h1 className="m-0 text-3xl font-semibold tracking-[-0.02em]">Check your inbox</h1>
      <p className="m-0 text-sm text-muted">
        We sent a link to <span className="font-medium break-all text-ink">{email}</span>
      </p>
      <button
        ref={backRef}
        type="button"
        onClick={onUseDifferentEmail}
        className="min-h-11 rounded-full px-4 text-sm text-muted transition-colors hover:bg-soft hover:text-ink"
      >
        Use a different email
      </button>
    </div>
  );
}
