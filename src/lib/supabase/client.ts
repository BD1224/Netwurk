// Supabase client for the BROWSER. Used for login and by useContacts.
// Stores the session in cookies, which the browser then sends to /api/search automatically.
import { createBrowserClient } from "@supabase/ssr";

/** False until .env.local has the Supabase keys, so the sign-in card can say so. */
export const supabaseBrowserConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
