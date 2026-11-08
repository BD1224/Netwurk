"use client";
// The private-beta card: one passcode field. The check happens on the server (enterBeta).
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { enterBeta, type BetaState } from "@/actions/beta.actions";
import { ArrowRightIcon, LockIcon, Spinner } from "@/components/shared/icons";

const INITIAL: BetaState = { error: null };

export function BetaGate({ next }: { next: string }) {
  const [state, action, pending] = useActionState(enterBeta, INITIAL);
  const router = useRouter();
  // Accepted: a normal navigation, so the proxy decides where to go (e.g. /signin if signed out).
  useEffect(() => {
    if (state.next) router.replace(state.next);
  }, [state.next, router]);
  const leaving = Boolean(state.next);

  return (
    <motion.div
      className="w-full max-w-[420px] rounded-[28px] border border-line bg-white/92 px-6 pt-9 pb-7 shadow-[0_40px_90px_-40px_rgba(9,9,11,0.35)] backdrop-blur-[10px] sm:px-8"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.2, 0.9, 0.1, 1] }}
    >
      <form action={action} className="m-0 flex flex-col gap-2.5">
        <span
          aria-hidden="true"
          className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-ink text-white shadow-[0_0_0_6px_#FFFFFF,0_14px_30px_-12px_rgba(9,9,11,0.4)]"
        >
          <LockIcon size={22} />
        </span>
        <h1 className="m-0 text-center text-3xl font-semibold tracking-[-0.03em]">Beta testers only</h1>
        <p className="m-0 mb-4 text-center text-sm text-muted">
          Netwurk is in private beta. Enter the passcode you were given to continue.
        </p>
        <input type="hidden" name="next" value={next} />
        <label
          htmlFor="beta-passcode"
          className="flex cursor-text flex-col gap-[3px] rounded-[22px] border border-line bg-canvas px-5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[#A1A1AA] focus-within:bg-surface focus-within:shadow-[0_0_0_5px_rgba(9,9,11,0.06)]"
        >
          <span className="text-xs font-semibold text-ink">Passcode</span>
          <input
            id="beta-passcode"
            name="passcode"
            type="password"
            autoComplete="off"
            autoFocus
            required
            aria-describedby={state.error ? "beta-error" : undefined}
            className="h-7 w-full bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending || leaving}
          className="mt-1 flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-5 text-[15px] font-medium text-white transition-[transform,opacity] duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {pending || leaving ? <Spinner size={18} /> : null}
          {pending ? "Checking" : leaving ? "Opening" : "Continue"}
          {!pending && !leaving && <ArrowRightIcon size={17} strokeWidth={2.25} />}
        </button>
        <p id="beta-error" role="alert" className="m-0 text-center text-[13px] text-[#B91C1C] empty:hidden">
          {state.error}
        </p>
      </form>
    </motion.div>
  );
}
