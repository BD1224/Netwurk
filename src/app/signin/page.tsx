// "/signin" route. Google or email magic link. Public; the proxy sends signed-in users to /discover.
// Accounts hold only the email and the contact book: signing up never creates a directory listing.
import type { Metadata } from "next";
import Link from "next/link";
import { SignInCard } from "@/components/auth/SignInCard";
import { NetworkBackground } from "@/components/search/NetworkBackground";
import { Header } from "@/components/shared/Header";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ error?: string | string[] }> };

export default async function SignInPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <NetworkBackground mode="idle" foundCount={0} />
      <Header />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-4 pt-6 pb-24">
        <SignInCard callbackError={typeof error === "string" ? error : undefined} />
        <Link href="/privacy" className="rounded text-xs text-subtle underline-offset-4 hover:text-ink hover:underline">
          Privacy policy
        </Link>
      </main>
    </div>
  );
}
