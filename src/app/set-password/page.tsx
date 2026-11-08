// "/set-password" route: choose a new password. Reached from a "Forgot password?" email link
// (which signs you in first), so it needs a session; the proxy sends signed-out visitors to /login.
import type { Metadata } from "next";
import { SetPasswordCard } from "@/components/auth/SetPasswordCard";
import { NetworkBackground } from "@/components/search/NetworkBackground";
import { Header } from "@/components/shared/Header";

export const metadata: Metadata = { title: "Set a password" };

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <NetworkBackground mode="idle" foundCount={0} />
      <Header />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-6 pb-24">
        <SetPasswordCard />
      </main>
    </div>
  );
}
