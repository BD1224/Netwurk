"use client";
// "/login" route. Email input -> Supabase magic link. Public (no login required).
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[20px] border border-line bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Log in to Networking Finder</h1>
        <label htmlFor="email" className="mt-5 block text-[13px] font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-line px-3 focus:border-accent-border focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="mt-4 h-11 w-full rounded-full bg-ink font-medium text-white disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Email me a login link"}
        </button>
        <p role="status" className="mt-3 text-sm text-muted">
          {state === "sent" && "Check your inbox for the link."}
          {state === "error" && message}
        </p>
      </form>
    </main>
  );
}
