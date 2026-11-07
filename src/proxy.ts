// Runs before every page request (Next 16 renamed "middleware" to "proxy").
// Refreshes the Supabase session, sends signed-out visitors to /signin,
// and sends signed-in visitors on /signin straight to /discover.
// Until Supabase keys are set in .env.local it does nothing, so the UI runs on mock data.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages anyone can open. "/" is the landing page; /auth/callback finishes sign-in. */
const isPublic = (path: string) =>
  path === "/" || ["/signin", "/auth"].some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
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

  const path = request.nextUrl.pathname;
  if (user && path === "/signin") return redirectTo("/discover");
  // API routes answer 401 themselves instead of redirecting.
  if (!user && !isPublic(path) && !path.startsWith("/api")) return redirectTo("/signin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
