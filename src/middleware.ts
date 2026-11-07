// Runs before every page request.
// Refreshes the Supabase login session and redirects logged-out users to /login.
// It builds its own client (instead of lib/supabase/server.ts) because middleware must
// write refreshed cookies onto the outgoing response, which next/headers cannot do here.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  // Skip /api (the route checks login itself and should return 401, not a redirect) and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
