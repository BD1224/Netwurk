// GET /auth/callback - the magic link and Google sign-in both land here.
// Swaps the one-time code for a session cookie, then opens Discover.
// On failure it goes back to /signin with a short reason the page turns into a message.
import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code && supabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/discover`);
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  // No code: an expired magic link, or the user backed out of Google.
  const reason = searchParams.get("error_code") === "otp_expired" ? "link" : "failed";
  return NextResponse.redirect(`${origin}/signin?error=${reason}`);
}
