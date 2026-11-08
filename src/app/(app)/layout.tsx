// Shared layout for logged-in pages (the "(app)" group is not part of the URL).
// The proxy (src/proxy.ts) already sends logged-out users to /login.
// It stays mounted between /search and /contacts, so it holds the search session and the
// contact book: results survive a trip to Contacts and contacts load once.
import { ContactsProvider } from "@/components/contacts/ContactsProvider";
import { SearchSessionProvider } from "@/components/search/SearchSession";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContactsProvider>
      <SearchSessionProvider>{children}</SearchSessionProvider>
    </ContactsProvider>
  );
}
