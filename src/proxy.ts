// Next.js proxy (formerly "middleware"). Runs before every page request.
// Refreshes the Supabase login session, redirects logged-out users to /login, and sends
// signed-in users on /login straight to /search. /login, /auth/* (email + Google links) and
// /privacy are public. The old /signin address forwards to /login.
// It builds its own client (instead of lib/supabase/server.ts) because the proxy must
// write refreshed cookies onto the outgoing response, which next/headers cannot do here.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() validates the token with Supabase and triggers the cookie refresh.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path === "/signin") return redirectTo("/login");
  const isPublic =
    path === "/login" || path === "/privacy" || path === "/auth" || path.startsWith("/auth/");
  if (user && path === "/login") return redirectTo("/search");
  if (!user && !isPublic) return redirectTo("/login");
  return response;

  // Redirect, keeping any refreshed session cookies.
  function redirectTo(pathname: string) {
    const redirect = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
}

export const config = {
  // Skip /api (the route checks login itself and should return 401, not a redirect) and static
  // files, including the tab icons, so they load on the sign-in page too.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
