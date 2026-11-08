// Supabase client for the SERVER (server actions, route handlers, server components).
// Reads the login cookie so queries run as the logged-in user (and RLS applies).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until .env.local has the Supabase keys; sign-in, search and contacts need them. */
export const supabaseConfigured = Boolean(url && anonKey);

export async function createClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured: set the keys in .env.local");
  }
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only.
          // Safe to ignore: the proxy refreshes the session.
        }
      },
    },
  });
}
