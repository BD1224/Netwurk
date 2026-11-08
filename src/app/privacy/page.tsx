// "/privacy" route: the privacy policy. Public (Google sign-in requires a privacy policy URL).
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

/** Where people send privacy questions and removal requests (set up forwarding at the registrar). */
const CONTACT_EMAIL = "privacy@netwurk.us";
const UPDATED = "November 8, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[680px] px-5 py-16 text-[15px] leading-relaxed text-ink">
      <Link href="/login" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-6 mb-1 text-3xl font-semibold tracking-[-0.03em]">Privacy policy</h1>
      <p className="m-0 text-sm text-subtle">Last updated {UPDATED}</p>

      <Section title="What this app does">
        Netwurk helps students and job seekers find professionals to network with. You type a role,
        company, school, location or research area; we search the public web for matching people and
        show what they have published professionally.
      </Section>

      <Section title="Information about you">
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Your account:</strong> your email address, and your password (stored only as a secure hash by
            our sign-in provider, Supabase) or your Google account&apos;s name and email if you sign in with Google.
          </li>
          <li>
            <strong>Your contact book:</strong> the people you save, and the notes, status and dates you add. Only you
            can see them.
          </li>
          <li>
            <strong>Your searches:</strong> the filters you type are sent to our search and AI providers to find and
            summarise matching people. We don&apos;t keep a history of your searches.
          </li>
        </ul>
        We don&apos;t sell your information or use it for advertising. You can delete saved contacts at any time,
        and you can ask us to delete your account by emailing us.
      </Section>

      <Section title="Information about the people we find">
        We only use professional information that is already public: name, current role and employer, school,
        city, professional links (LinkedIn profile URL, GitHub, personal or lab website), research areas,
        publications and talks, each with a link to where it came from. We never collect home addresses,
        personal phone numbers, family details or personal social media, and we never scrape LinkedIn: a
        LinkedIn link only appears when a web search returned it. Photos come only from a person&apos;s own website,
        team or lab page, GitHub or Gravatar. We don&apos;t keep a directory of people; results exist only for the
        search that found them, unless a user saves someone to their own contact book. If you would like
        information about yourself removed, email us and we will remove it.
      </Section>

      <Section title="Services we use">
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
          <li>Supabase: accounts and contact books (database and sign-in)</li>
          <li>Vercel: hosting</li>
          <li>Google (Gemini): reads search results and writes the summaries</li>
          <li>Serper: Google search results</li>
          <li>GitHub and Gravatar: public profiles and photos</li>
          <li>Google: optional sign-in with your Google account</li>
        </ul>
      </Section>

      <Section title="Cookies">
        We only use the cookies needed to keep you signed in. No tracking or advertising cookies.
      </Section>

      <Section title="Contact">
        Questions, or want something removed? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        .
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 flex flex-col gap-3">
      <h2 className="m-0 text-lg font-semibold">{title}</h2>
      <div className="m-0 flex flex-col gap-3 text-[#3F3F46]">{children}</div>
    </section>
  );
}
