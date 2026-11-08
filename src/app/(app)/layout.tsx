// Shared layout for logged-in pages (the "(app)" group is not part of the URL).
// Renders the Navbar and double-checks the user is logged in.
// Placeholder: just renders the page until the Navbar + login check are added.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
