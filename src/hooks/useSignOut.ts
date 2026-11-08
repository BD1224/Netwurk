"use client";
// Signs out in the browser (clears the Supabase session cookie), then goes to /login.
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSignOut() {
  const router = useRouter();
  return useCallback(async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh(); // drop any cached logged-in pages
  }, [router]);
}
