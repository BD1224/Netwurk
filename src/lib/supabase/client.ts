// Supabase client for the BROWSER. Used for login and by useContacts.
// Stores the session in cookies, which the browser then sends to /api/search automatically.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
