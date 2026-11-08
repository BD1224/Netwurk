// "/login" route. Google, or email + password. Public; the proxy sends signed-in users to /search.
// Accounts hold only the email and the contact book: signing up never creates a directory listing.
import type { Metadata } from "next";
import { SignInCard } from "@/components/auth/SignInCard";
import { NetworkBackground } from "@/components/search/NetworkBackground";
import { Header } from "@/components/shared/Header";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ error?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <NetworkBackground mode="idle" foundCount={0} />
      <Header />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-6 pb-24">
        <SignInCard callbackError={typeof error === "string" ? error : undefined} />
      </main>
    </div>
  );
}
