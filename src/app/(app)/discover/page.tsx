// "/discover" route - FEATURE 1: the Discover page (find new people).
import { contactSummary } from "@/actions/contacts.actions";
import { Discover } from "@/components/search/Discover";

export const dynamic = "force-dynamic"; // per-user data

export default async function DiscoverPage() {
  const { count, personIds } = await contactSummary().catch(() => ({ count: 0, personIds: [] }));
  return <Discover initialContactCount={count} initialSavedIds={personIds} />;
}
