// Shared layout for logged-in pages (the "(app)" group is not part of the URL).
// The proxy (src/proxy.ts) already sends logged-out users to /login.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
