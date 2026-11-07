// Shared layout for logged-in pages (the "(app)" group is not part of the URL).
// The proxy (src/proxy.ts) already sends logged-out users to /signin.
// It stays mounted between /discover and /contacts, so it holds the Discover search session.
import { SearchSessionProvider } from "@/components/search/SearchSession";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <SearchSessionProvider>{children}</SearchSessionProvider>;
}
