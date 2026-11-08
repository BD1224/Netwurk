"use server";
// Server actions for the signed-in session.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INTRO_COOKIE } from "@/components/search/intro-cookie";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** Ends the Supabase session (clears the login cookie) and goes to the sign-in page.
 *  Also clears the intro cookie, so the "linking up" intro plays after the next sign-in. */
export async function signOut() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(INTRO_COOKIE);
  redirect("/signin");
}
