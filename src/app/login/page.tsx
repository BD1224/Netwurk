// /login. TEMPORARY test page: log in as the test user, then call /api/search to check the backend.
// Replace with the real magic-link login once the backend is confirmed working.
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const email = process.env.NEXT_PUBLIC_TEST_USER_EMAIL!;
const password = process.env.NEXT_PUBLIC_TEST_USER_PASSWORD!;

export default function LoginPage() {
  const [loginMsg, setLoginMsg] = useState("");
  const [searchMsg, setSearchMsg] = useState("");

  async function login() {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoginMsg(error ? `Login failed: ${error.message}` : "Logged in");
  }

  // The browser attaches the login cookie to this request automatically.
  async function runBackend() {
    const res = await fetch("/api/search", { method: "POST" });
    setSearchMsg(`${res.status} ${await res.text()}`);
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
