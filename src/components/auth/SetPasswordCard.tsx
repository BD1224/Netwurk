"use client";
// Card for choosing a new password (after a "Forgot password?" link signed you in).
// Saves it with supabase.auth.updateUser, then opens Discover.
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, Spinner } from "@/components/shared/icons";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 6;
const FIELD =
  "flex cursor-text flex-col gap-[3px] rounded-[22px] border border-line bg-canvas px-5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[#A1A1AA] focus-within:bg-surface focus-within:shadow-[0_0_0_5px_rgba(9,9,11,0.06)]";
const INPUT =
  "h-7 w-full bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none";

export function SetPasswordCard() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setError("");
    setPending(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setPending(false);
        if (error.code === "same_password") return setError("That's your current password. Pick a new one.");
        if (error.code === "weak_password") return setError("Pick a stronger password.");
        if (error.status === 401 || error.code === "session_not_found") {
          return setError("Your reset link expired. Go back to sign in and click Forgot password again.");
        }
        return setError("Couldn't save your password. Try again.");
      }
      router.replace("/discover");
      router.refresh();
    } catch {
      setPending(false);
      setError("Couldn't reach the server. Check your connection.");
    }
  }

  return (
    <motion.div
      className="w-full max-w-[420px] rounded-[28px] border border-line bg-white/92 px-6 pt-9 pb-7 shadow-[0_40px_90px_-40px_rgba(9,9,11,0.35)] backdrop-blur-[10px] sm:px-8"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.2, 0.9, 0.1, 1] }}
    >
      <form onSubmit={save} className="m-0 flex flex-col gap-2.5" noValidate>
        <h1 className="m-0 mb-1 text-center text-3xl font-semibold tracking-[-0.03em]">Set a password</h1>
        <p className="m-0 mb-3 text-center text-sm text-muted">You&apos;ll use it with your email to sign in.</p>
        <label htmlFor="new-password" className={FIELD}>
          <span className="text-xs font-semibold text-ink">New password</span>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            className={INPUT}
          />
        </label>
        <label htmlFor="confirm-password" className={FIELD}>
          <span className="text-xs font-semibold text-ink">Type it again</span>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            className={INPUT}
          />
        </label>
        <button
          type="submit"
          disabled={pending || password.length < MIN_PASSWORD || confirm.length === 0}
          className="mt-1 flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-5 text-[15px] font-medium text-white transition-[transform,opacity] duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100"
        >
          {pending ? <Spinner size={18} /> : null}
          {pending ? "Saving" : "Save password"}
          {!pending && <ArrowRightIcon size={17} strokeWidth={2.25} />}
        </button>
        <p role="alert" className="m-0 text-center text-[13px] text-[#B91C1C] empty:hidden">
          {error}
        </p>
      </form>
    </motion.div>
  );
}
