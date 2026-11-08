// GET /auth/confirm?token_hash=...&type=...&next=/path - signs someone in from a one-time token
// (an email link built with {{ .TokenHash }}, or a link generated in the Supabase dashboard/admin API).
// Unlike /auth/callback it doesn't need the browser that asked for the link, so it works on any device.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeNextPath } from "@/components/auth/next-cookie";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // A password-reset link goes to /set-password unless it says otherwise.
  const next = safeNextPath(searchParams.get("next")) ?? (type === "recovery" ? "/set-password" : "/discover");

  if (tokenHash && type && TYPES.includes(type) && supabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/signin?error=link`);
}
