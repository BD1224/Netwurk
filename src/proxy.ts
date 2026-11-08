// Runs before every page request (Next 16 renamed "middleware" to "proxy").
// First the private-beta gate (only when BETA_PASSCODE is set): no passcode cookie -> /beta.
// Then refreshes the Supabase session, sends signed-out visitors to /signin,
// and sends signed-in visitors on /signin straight to /discover.
// Until Supabase keys are set in .env.local it does nothing (and search/contacts return errors).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { BETA_COOKIE, betaGateOn, betaToken, skipsBetaGate } from "@/lib/beta";

/** Pages anyone can open. "/" is the landing page; /auth/callback finishes sign-in; /privacy is the policy; /beta is the passcode screen. */
const isPublic = (path: string) =>
  path === "/" || ["/signin", "/auth", "/privacy", "/beta"].some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (betaGateOn() && !skipsBetaGate(path) && request.cookies.get(BETA_COOKIE)?.value !== (await betaToken())) {
    if (path.startsWith("/api")) return NextResponse.json({ error: "Private beta" }, { status: 403 });
    const gate = request.nextUrl.clone();
    gate.pathname = "/beta";
    gate.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(gate);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect, keeping any refreshed session cookies.
  const redirectTo = (pathname: string) => {
    const target = request.nextUrl.clone();
    target.pathname = pathname;
    target.search = "";
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (user && path === "/signin") return redirectTo("/discover");
  // API routes answer 401 themselves instead of redirecting.
  if (!user && !isPublic(path) && !path.startsWith("/api")) return redirectTo("/signin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
