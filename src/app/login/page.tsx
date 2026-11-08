// /login. TEMPORARY: one-click login as the test user from .env.local.
// Replace with the real magic-link login (signInWithOtp) once the UI is in.
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const email = process.env.NEXT_PUBLIC_TEST_USER_EMAIL!;
const password = process.env.NEXT_PUBLIC_TEST_USER_PASSWORD!;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function login() {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) setError(`Login failed: ${error.message}`);
    else router.push("/search");
  }

  return (
    <div style={{ padding: 16 }}>
      <p>Test user: {email}</p>
      <button onClick={login}>Log in</button>
      <pre>{error}</pre>
    </div>
  );
}
