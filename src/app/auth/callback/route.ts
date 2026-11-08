// GET /auth/callback - Google sign-in, email confirmation and password-reset links all land here.
// Swaps the one-time code for a session cookie, then opens /search (or /set-password after a
// "Forgot password?" link, read from a short-lived cookie the sign-in card set).
// On failure it goes back to /login with a short reason the page turns into a message.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NEXT_COOKIE, safeNextPath } from "@/components/auth/next-cookie";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const next = safeNextPath(cookieStore.get(NEXT_COOKIE)?.value) ?? "/search";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      cookieStore.delete(NEXT_COOKIE);
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  // No code: an expired link, or the user backed out of Google.
  const reason = searchParams.get("error_code") === "otp_expired" ? "link" : "failed";
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
