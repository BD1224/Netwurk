// Root layout: wraps every page. Loads globals.css and sets the DaisyUI theme (<html data-theme>).
// For now just the bare HTML shell, which Next.js requires.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
