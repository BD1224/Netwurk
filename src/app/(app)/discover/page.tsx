// "/discover" route - FEATURE 1: the Discover page (find new people).
import { cookies } from "next/headers";
import { contactSummary } from "@/actions/contacts.actions";
import { Discover } from "@/components/search/Discover";
import { INTRO_COOKIE } from "@/components/search/intro-cookie";

export const dynamic = "force-dynamic"; // per-user data

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function DiscoverPage({ searchParams }: Props) {
  const [{ count, personIds }, cookieStore, params] = await Promise.all([
    contactSummary().catch(() => ({ count: 0, personIds: [] })),
    cookies(),
    searchParams,
  ]);
  // The "linking up" intro plays once per browser session, but not when opening a shared ?person= link.
  const playIntro = !cookieStore.has(INTRO_COOKIE) && !params.person;
  return <Discover playIntro={playIntro} initialContactCount={count} initialSavedIds={personIds} />;
}
