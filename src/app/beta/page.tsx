// "/beta" route: the private-beta passcode screen (only shown when BETA_PASSCODE is set).
import type { Metadata } from "next";
import Link from "next/link";
import { BetaGate } from "@/components/auth/BetaGate";
import { NetworkBackground } from "@/components/search/NetworkBackground";
import { safeNext } from "@/lib/beta";

export const metadata: Metadata = { title: "Private beta" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function BetaPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <NetworkBackground mode="idle" foundCount={0} />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24">
        <BetaGate next={safeNext(next)} />
        <Link href="/privacy" className="rounded-full bg-white/85 px-3 py-1 text-xs text-subtle backdrop-blur-sm underline-offset-4 hover:text-ink hover:underline">
          Privacy policy
        </Link>
      </main>
    </div>
  );
}
