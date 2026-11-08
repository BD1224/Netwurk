"use client";
// The sign-in card: "Continue with Google", or email + password.
//   Sign in        - email + password, straight into /search (no email sent)
//   Create account - email + password; Supabase emails a confirmation link once
//   Forgot password? - emails a link that lands on /set-password
// After an email is sent the card swaps to "Check your inbox"; "Back to sign in" swaps back.
// Errors show as one line under the submit button.
import type { AuthError } from "@supabase/supabase-js";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatedTitle } from "@/components/shared/AnimatedTitle";
import { ArrowRightIcon, Spinner } from "@/components/shared/icons";
import { createClient, supabaseBrowserConfigured } from "@/lib/supabase/client";
import { CheckInbox } from "./CheckInbox";
import { GoogleMark } from "./GoogleMark";
import { NEXT_COOKIE } from "./next-cookie";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 6; // Supabase's default minimum

/** Reasons /auth/callback can send back in ?error=. */
const CALLBACK_ERRORS: Record<string, string> = {
  link: "That link expired or was opened in another browser. Try again.",
  failed: "Sign-in didn't finish. Try again.",
};
const NOT_CONFIGURED = "Sign-in isn't set up yet: add the Supabase keys to .env.local.";

const swap: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.2, 0.9, 0.1, 1] } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.15 } },
};

type Mode = "signin" | "signup";
type Pending = "google" | "password" | "reset" | null;
/** Which email we just sent, if any. */
type Sent = "confirm" | "reset" | null;

export function SignInCard({ callbackError }: { callbackError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState<Sent>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState(callbackError ? (CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.failed) : "");
  // True once the user has come back from "Check your inbox", so the form animates in and grabs focus.
  const [returning, setReturning] = useState(false);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordValid = password.length >= MIN_PASSWORD;
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!emailValid) return setError("Enter your email address.");
    if (!passwordValid) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (!supabaseBrowserConfigured) return setError(NOT_CONFIGURED);
    setError("");
    setPending("password");
    const auth = createClient().auth;
    let leaving = false; // true once we're navigating away: keep the spinner
    try {
      if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) return setError(messageFor(error, "Couldn't sign in. Try again."));
        // The session cookie is set; refresh so server components see it.
        leaving = true;
        router.replace("/search");
        router.refresh();
        return;
      }
      const { data, error } = await auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) return setError(messageFor(error, "Couldn't create your account. Try again."));
      // Supabase hides whether an email is taken: it "succeeds" with no identities and sends nothing.
      if (data.user && data.user.identities?.length === 0) {
        return setError("There's already an account with that email. Sign in, or use Forgot password to set one.");
      }
      if (data.session) {
        // "Confirm email" is off in Supabase: signed in straight away.
        leaving = true;
        router.replace("/search");
        router.refresh();
        return;
      }
      setSent("confirm");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      if (!leaving) setPending(null);
    }
  }

  async function forgotPassword() {
    if (pending) return;
    if (!emailValid) return setError("Type your email above first, then click Forgot password.");
    if (!supabaseBrowserConfigured) return setError(NOT_CONFIGURED);
    setError("");
    setPending("reset");
    try {
      // After the link signs them in, /auth/callback sends them to /set-password (read from this cookie).
      document.cookie = `${NEXT_COOKIE}=/set-password; path=/; max-age=3600; SameSite=Lax`;
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl() });
      if (error) setError(messageFor(error, "Couldn't send the reset link. Try again."));
      else setSent("reset");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setPending(null);
    }
  }

  function switchMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError("");
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
                purpose={sent === "confirm" ? "to confirm your account" : "to reset your password"}
                onUseDifferentEmail={() => {
                  setReturning(true);
                  setSent(null);
                  setMode("signin");
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
                words={[{ text: "Find" }, { text: "your" }, { text: "people" }]}
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

              <PasswordForm
                mode={mode}
                email={email}
                password={password}
                onEmailChange={(value) => {
                  setEmail(value);
                  if (error) setError("");
                }}
                onPasswordChange={(value) => {
                  setPassword(value);
                  if (error) setError("");
                }}
                ready={emailValid && passwordValid}
                pending={pending}
                error={error}
                autoFocus={returning}
                onSubmit={submit}
                onForgotPassword={forgotPassword}
              />

              <p className="m-0 text-center text-sm text-muted">
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="rounded font-medium text-ink underline-offset-4 hover:underline"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}

type PasswordFormProps = {
  mode: Mode;
  email: string;
  password: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  ready: boolean;
  pending: Pending;
  error: string;
  autoFocus: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
};

const FIELD =
  "flex cursor-text flex-col gap-[3px] rounded-[22px] border border-line bg-canvas px-5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[#A1A1AA] focus-within:bg-surface focus-within:shadow-[0_0_0_5px_rgba(9,9,11,0.06)]";
const INPUT =
  "h-7 w-full bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none";

function PasswordForm({
  mode,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  ready,
  pending,
  error,
  autoFocus,
  onSubmit,
  onForgotPassword,
}: PasswordFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const signingUp = mode === "signup";

  return (
    <form onSubmit={onSubmit} className="m-0 flex flex-col gap-2.5" noValidate>
      <label htmlFor="signin-email" className={FIELD}>
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
          className={INPUT}
        />
      </label>

      <label htmlFor="signin-password" className={FIELD}>
        <span className="flex items-center justify-between text-xs font-semibold text-ink">
          Password
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="rounded px-1 text-xs font-medium text-subtle hover:text-ink"
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
        <input
          id="signin-password"
          type={showPassword ? "text" : "password"}
          autoComplete={signingUp ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={signingUp ? `At least ${MIN_PASSWORD} characters` : "Your password"}
          aria-describedby={error ? "signin-error" : undefined}
          className={INPUT}
        />
      </label>

      {!signingUp && (
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={pending !== null}
          className="self-end rounded px-1 text-[13px] text-muted hover:text-ink disabled:opacity-50"
        >
          {pending === "reset" ? "Sending…" : "Forgot password?"}
        </button>
      )}

      <button
        type="submit"
        disabled={!ready || pending !== null}
        className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-5 text-[15px] font-medium text-white transition-[transform,opacity] duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 motion-reduce:hover:scale-100"
      >
        {pending === "password" ? (
          <>
            <Spinner size={18} />
            {signingUp ? "Creating account" : "Signing in"}
          </>
        ) : (
          <>
            {signingUp ? "Create account" : "Sign in"}
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
  if (error.code === "invalid_credentials") {
    return "Wrong email or password. No password yet? Use Forgot password to set one.";
  }
  if (error.code === "email_not_confirmed") return "Confirm your email first: open the link we sent you.";
  if (error.code === "user_already_exists") return "There's already an account with that email. Sign in instead.";
  if (error.code === "weak_password") return `Pick a stronger password (at least ${MIN_PASSWORD} characters).`;
  // Supabase's built-in email sender only mails members of the Supabase team, a few times an hour.
  if (error.code === "email_address_not_authorized") {
    return "We can't email that address yet (the app's email sender isn't set up for everyone).";
  }
  if (error.code === "over_email_send_rate_limit") return "Too many emails sent. Wait about an hour, then try again.";
  if (error.status === 429 || error.code?.startsWith("over_")) return "Too many tries. Wait a minute, then try again.";
  if (error.code === "email_address_invalid" || error.code === "validation_failed") {
    return "That email address doesn't look right.";
  }
  if (error.name === "AuthRetryableFetchError") return "Couldn't reach the server. Check your connection.";
  return fallback;
}
