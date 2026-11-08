"use server";
// Server actions for the signed-in session.
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** Ends the Supabase session (clears the login cookie) and goes to the sign-in page. */
export async function signOut() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/signin");
}
