"use client";
// The sign-in card: "Continue with Google", or an email magic link.
// After the link is sent the card swaps to "Check your inbox"; "Use a different email"
// swaps back with the typed email kept. Errors show as one line under the submit button.
import type { AuthError } from "@supabase/supabase-js";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AnimatedTitle } from "@/components/shared/AnimatedTitle";
import { ArrowRightIcon, Spinner } from "@/components/shared/icons";
import { createClient, supabaseBrowserConfigured } from "@/lib/supabase/client";
import { CheckInbox } from "./CheckInbox";
import { GoogleMark } from "./GoogleMark";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Reasons /auth/callback can send back in ?error=. */
const CALLBACK_ERRORS: Record<string, string> = {
  link: "That link expired or was opened in another browser. Send a new one.",
  failed: "Sign-in didn't finish. Try again.",
};
const NOT_CONFIGURED = "Sign-in isn't set up yet: add the Supabase keys to .env.local.";

const swap: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.2, 0.9, 0.1, 1] } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.15 } },
};

type Pending = "google" | "email" | null;

export function SignInCard({ callbackError }: { callbackError?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState(callbackError ? (CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.failed) : "");
  // True once the user has come back from "Check your inbox", so the form animates in and grabs focus.
  const [returning, setReturning] = useState(false);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const callbackUrl = () => `${window.location.origin}/auth/callback`;

  async function continueWithGoogle() {
    if (!supabaseBrowserConfigured) return setError(NOT_CONFIGURED);
    setError("");
    setPending("google");
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      // On success the browser is already leaving for Google, so keep the spinner.
      if (error) {
        setPending(null);
        setError(messageFor(error, "Couldn't open Google sign-in. Try again."));
      }
    } catch {
      setPending(null);
      setError("Couldn't open Google sign-in. Try again.");
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || pending) return;
    if (!supabaseBrowserConfigured) return setError(NOT_CONFIGURED);
    setError("");
    setPending("email");
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) setError(messageFor(error, "Couldn't send the link. Try again."));
      else setSent(true);
    } catch {
      setError("Couldn't send the link. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="w-full max-w-[420px] rounded-[28px] border border-line bg-white/92 px-6 pt-9 pb-7 shadow-[0_40px_90px_-40px_rgba(9,9,11,0.35)] backdrop-blur-[10px] sm:px-8"
        initial={{ opacity: 0, y: 40, scale: 0.95, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.2, 0.9, 0.1, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {sent ? (
            <motion.div key="sent" variants={swap} initial="hidden" animate="shown" exit="exit">
              <CheckInbox
                email={email.trim()}
                onUseDifferentEmail={() => {
                  setReturning(true);
                  setSent(false);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={swap}
              initial="hidden"
              animate="shown"
              exit="exit"
              className="flex flex-col gap-[22px]"
            >
              <AnimatedTitle
                words={[{ text: "Find" }, { text: "your" }, { text: "people", accent: true }]}
                delay={returning ? 0.1 : 0.5}
                className="m-0 text-center text-[34px] leading-[1.1] tracking-[-0.04em]"
              />

              <button
                type="button"
                onClick={continueWithGoogle}
                disabled={pending !== null}
                className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-5 text-[15px] font-medium text-ink transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-px hover:border-[#D4D4D8] hover:bg-soft disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0"
              >
                {pending === "google" ? <Spinner size={18} /> : <GoogleMark size={18} />}
                Continue with Google
              </button>

              <div aria-hidden="true" className="flex items-center gap-3 text-xs text-subtle">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>

              <EmailForm
                email={email}
                onEmailChange={(value) => {
                  setEmail(value);
                  if (error) setError("");
                }}
                valid={emailValid}
                pending={pending}
                error={error}
                autoFocus={returning}
                onSubmit={sendLink}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}

type EmailFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  valid: boolean;
  pending: Pending;
  error: string;
  autoFocus: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

function EmailForm({ email, onEmailChange, valid, pending, error, autoFocus, onSubmit }: EmailFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <form onSubmit={onSubmit} className="m-0 flex flex-col gap-2.5" noValidate>
      <label
        htmlFor="signin-email"
        className="flex cursor-text flex-col gap-[3px] rounded-[22px] border border-line bg-canvas px-5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-accent-border focus-within:bg-surface focus-within:shadow-[0_0_0_5px_rgba(79,70,229,0.12)]"
      >
        <span className="text-xs font-semibold text-ink">Email</span>
        <input
          ref={inputRef}
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@school.edu"
          aria-describedby={error ? "signin-error" : undefined}
          className="h-7 w-full bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={!valid || pending !== null}
        className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-5 text-[15px] font-medium text-white transition-[transform,background-color,opacity] duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:scale-[1.02] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 disabled:hover:bg-ink motion-reduce:hover:scale-100"
      >
        {pending === "email" ? (
          <>
            <Spinner size={18} />
            Sending
          </>
        ) : (
          <>
            Email me a sign-in link
            <ArrowRightIcon size={17} strokeWidth={2.25} />
          </>
        )}
      </button>
      <p id="signin-error" role="alert" className="m-0 text-center text-[13px] text-[#B91C1C] empty:hidden">
        {error}
      </p>
    </form>
  );
}

/** Turns a Supabase auth error into one short, human sentence. */
function messageFor(error: AuthError, fallback: string) {
  if (error.status === 429 || error.code?.startsWith("over_")) return "Too many tries. Wait a minute, then try again.";
  if (error.code === "email_address_invalid" || error.code === "validation_failed") {
    return "That email address doesn't look right.";
  }
  if (error.name === "AuthRetryableFetchError") return "Couldn't reach the server. Check your connection.";
  return fallback;
}
