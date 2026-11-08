// /login. TEMPORARY test page: log in as the test user, then call /api/search to check the backend.
// Replace with the real magic-link login once the backend is confirmed working.
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const email = process.env.NEXT_PUBLIC_TEST_USER_EMAIL!;
const password = process.env.NEXT_PUBLIC_TEST_USER_PASSWORD!;

// TEMPORARY stub filters for testing the real search
const STUB_CRITERIA = {
  roles: ["Financial analyst"],
  states: ["Boston"],
  universities: ["UMass Amherst"],
};

export default function LoginPage() {
  const [loginMsg, setLoginMsg] = useState("");
  const [searchMsg, setSearchMsg] = useState("");

  async function login() {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoginMsg(error ? `Login failed: ${error.message}` : "Logged in");
  }

  // The browser attaches the login cookie to this request automatically.
  // Sends stub filters and prints each streamed line (one SearchEvent per line) as it arrives.
  async function runBackend() {
    setSearchMsg("Searching...\n");
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(STUB_CRITERIA),
    });
    if (!res.ok || !res.body) {
      setSearchMsg(`${res.status} ${await res.text()}`);
      return;
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      setSearchMsg((prev) => prev + value);
    }
  }

  return (
    <div>
      <p>Test user: {email} / {password}</p>
      <button onClick={login}>Log in</button>
      <pre>{loginMsg}</pre>
      <button onClick={runBackend}>Run backend</button>
      <pre>{searchMsg}</pre>
    </div>
  );
}
