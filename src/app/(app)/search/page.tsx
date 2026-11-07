// "/search" route - FEATURE 1: the Discover page (find new people).
import { countContacts } from "@/actions/contacts.actions";
import { Discover } from "@/components/search/Discover";

export const dynamic = "force-dynamic"; // per-user data

export default async function SearchPage() {
  const contactCount = await countContacts().catch(() => 0);
  return <Discover initialContactCount={contactCount} />;
}
