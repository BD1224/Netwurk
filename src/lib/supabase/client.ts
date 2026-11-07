// Supabase client for the BROWSER (sign-in page).
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until .env.local has the Supabase keys (Next inlines NEXT_PUBLIC_ values at build time). */
export const supabaseBrowserConfigured = Boolean(url && anonKey);

export function createClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured: set the keys in .env.local");
  }
  return createBrowserClient(url, anonKey);
}
