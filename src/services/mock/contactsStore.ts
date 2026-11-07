import "server-only";
// In-memory contact book used until Supabase is configured, so Discover's Save and the
// contact book work end to end. One shared book, reset whenever the server restarts.
// People, orgs and links are made up; URLs point at example.com.
import type { Contact, ContactDetails, ContactUpdate, PersonProfile } from "@/types";

const link = (kind: string, slug: string) => `https://example.com/${kind}/${slug}`;
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const EMPTY_DETAILS: ContactDetails = { repos: [], papers: [], accolades: [], sources: [] };

// What the search agent found for each seeded contact (the Discover overlay's extra details).
const SEED_DETAILS: Record<string, Partial<ContactDetails>> = {
  "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d01": {
    repos: [
      { name: "sparse-retrieval", description: "Fast retrieval for long-context models", language: "Python", stars: 1240, pushed_at: ago(1), url: link("github", "mosei/sparse-retrieval") },
      { name: "tiny-transformer", description: "A readable transformer in 300 lines", language: "Python", stars: 612, pushed_at: ago(5), url: link("github", "mosei/tiny-transformer") },
      { name: "eval-kit", description: "Small benchmark harness", language: "Python", stars: 88, pushed_at: ago(14), url: link("github", "mosei/eval-kit") },
    ],
    papers: [
      { title: "Sparse retrieval for long-context language models", venue: "NeurIPS", year: 2025, url: link("papers", "sparse-retrieval") },
      { title: "Curriculum learning for low-resource speech", venue: "ICASSP", year: 2022, url: link("papers", "curriculum-speech") },
    ],
    accolades: ["Conference spotlight paper, 2025", "University dissertation fellowship"],
    sources: [
      { label: "Google Scholar", url: link("scholar", "marcus") },
      { label: "Personal site", url: link("site", "marcus") },
    ],
  },
  "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d02": {
    repos: [
      { name: "motion-a11y", description: "Reduced-motion friendly animation helpers", language: "TypeScript", stars: 402, pushed_at: ago(4), url: link("github", "hanakim/motion-a11y") },
      { name: "contrast-cli", description: "Check color contrast from the terminal", language: "Rust", stars: 19, pushed_at: ago(30), url: link("github", "hanakim/contrast-cli") },
    ],
    papers: [{ title: "Accessible motion in data-dense interfaces", venue: "Design showcase", year: 2022, url: null }],
    accolades: ["Internal design award, 2024"],
    sources: [{ label: "Personal site", url: link("site", "hana") }],
  },
  "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d03": {
    papers: [{ title: "Order-book signals for short-horizon returns", venue: "Working paper", year: 2025, url: link("papers", "order-book") }],
    accolades: ["Student trading competition organizer"],
    sources: [{ label: "Club roster", url: link("club", "fintech") }],
  },
  "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d04": {
    repos: [
      { name: "precip-diffusion", description: "Diffusion models for rainfall downscaling", language: "Python", stars: 890, pushed_at: ago(1), url: link("github", "smartins/precip-diffusion") },
      { name: "era5-loader", description: "Fast climate data loader", language: "Python", stars: 120, pushed_at: ago(21), url: link("github", "smartins/era5-loader") },
    ],
    papers: [{ title: "Downscaling precipitation forecasts with diffusion models", venue: "ICLR Workshop", year: 2026, url: link("papers", "precip") }],
    accolades: ["Graduate research fellow", "Best poster, climate + AI workshop 2025"],
    sources: [{ label: "Google Scholar", url: link("scholar", "sofia") }],
  },
  "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d05": {
    accolades: ["Startup accelerator demo day, 2025"],
    sources: [{ label: "Personal site", url: link("site", "aiden") }],
  },
  "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d06": {
    repos: [
      { name: "ledger-sim", description: "Double-entry ledger simulator", language: "Ruby", stars: 275, pushed_at: ago(6), url: link("github", "rnovak/ledger-sim") },
      { name: "rate-limit-kit", description: "Token-bucket rate limiting", language: "Go", stars: 190, pushed_at: ago(14), url: link("github", "rnovak/rate-limit-kit") },
    ],
    accolades: ["Internal hackathon winner, 2024"],
    sources: [{ label: "GitHub", url: link("github", "rnovak") }],
  },
};

function seed(): Contact[] {
  return seedContacts().map((c) => ({ ...c, details: { ...EMPTY_DETAILS, ...SEED_DETAILS[c.id] } }));
}

function seedContacts(): Contact[] {
  const base = {
    person_id: null,
    details: EMPTY_DETAILS,
    status: "to_contact" as const,
    linkedin_url: null,
    github_url: null,
    personal_site: null,
  };
  return [
    {
      ...base,
      id: "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d01",
      full_name: "Marcus Osei",
      title: "ML Researcher",
      company: "Lumen AI Lab",
      university: "Lakeside University",
      location: "New York",
      email: "marcus.osei@example.com",
      email_status: "confirmed",
      linkedin_url: link("linkedin", "marcus-osei"),
      github_url: link("github", "mosei"),
      personal_site: link("site", "marcus"),
      research_areas: ["Machine learning", "Retrieval"],
      talking_points:
        "Gave a 2025 conference talk on sparse retrieval\nMentors members of a university robotics club\nOpen-sourced tiny-transformer, 600+ stars",
      sources: ["Google Scholar", "GitHub", "Personal site"],
      notes: "Asked about lab openings. Follow up after his talk.",
      last_contacted: "2026-10-28",
      status: "reached_out",
      created_at: "2026-10-20T15:00:00.000Z",
    },
    {
      ...base,
      id: "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d02",
      full_name: "Hana Kim",
      title: "UX Engineer",
      company: "Brightline",
      university: "Lakeside University",
      location: "New York",
      email: "hana.kim@example.com",
      email_status: "guessed",
      linkedin_url: link("linkedin", "hana-kim"),
      github_url: link("github", "hanakim"),
      personal_site: link("site", "hana"),
      research_areas: ["HCI", "Accessibility"],
      talking_points:
        "Builds accessible motion components\nReviews student design portfolios\nSpoke at a campus design meetup this fall",
      sources: ["Personal site", "GitHub"],
      notes: null,
      last_contacted: null,
      created_at: "2026-10-19T15:00:00.000Z",
    },
    {
      ...base,
      id: "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d03",
      full_name: "Jordan Lee",
      title: "Quant Researcher",
      company: "Northgate Capital",
      university: "Harbor Institute of Technology",
      location: "New York",
      email: null,
      email_status: null,
      linkedin_url: link("linkedin", "jordan-lee"),
      research_areas: ["Finance", "Machine learning"],
      talking_points: "Co-wrote a working paper on order-book signals\nRuns a student trading competition",
      sources: ["Club roster"],
      notes: "Met at the fintech society mixer.",
      last_contacted: "2026-09-30",
      status: "met",
      created_at: "2026-10-18T15:00:00.000Z",
    },
    {
      ...base,
      id: "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d04",
      full_name: "Sofia Martins",
      title: "PhD Student",
      company: "Climate Systems Lab",
      university: "Bayview University",
      location: "Boston",
      email: "sofia.martins@example.edu",
      email_status: "confirmed",
      github_url: link("github", "smartins"),
      personal_site: link("site", "sofia"),
      research_areas: ["Climate", "Machine learning"],
      talking_points:
        "Works on precipitation forecasting with diffusion models\nLooking for undergrad research assistants",
      sources: ["Google Scholar", "GitHub"],
      notes: null,
      last_contacted: null,
      created_at: "2026-10-17T15:00:00.000Z",
    },
    {
      ...base,
      id: "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d05",
      full_name: "Aiden Brooks",
      title: "Founder",
      company: "Kiln Robotics",
      university: "Lakeside University",
      location: "New York",
      email: "aiden@example.com",
      email_status: "confirmed",
      linkedin_url: link("linkedin", "aiden-brooks"),
      personal_site: link("site", "aiden"),
      research_areas: ["Robotics"],
      talking_points: "Hiring a firmware intern for the spring\nDemo day in December",
      sources: ["Club roster", "Personal site"],
      notes: "Wants a firmware person.",
      last_contacted: "2026-11-02",
      status: "reached_out",
      created_at: "2026-10-16T15:00:00.000Z",
    },
    {
      ...base,
      id: "6f1c2a4e-1b7d-4c1e-9a51-2d3f4b5c6d06",
      full_name: "Rachel Novak",
      title: "Software Engineer",
      company: "Ledgerline",
      university: "Westbrook University",
      location: "San Francisco",
      email: "rachel.novak@example.com",
      email_status: "guessed",
      linkedin_url: link("linkedin", "rachel-novak"),
      github_url: link("github", "rnovak"),
      research_areas: ["Systems", "Finance"],
      talking_points: "New-grad referrals open in January\nWorks on payments infrastructure",
      sources: ["GitHub"],
      notes: null,
      last_contacted: "2026-08-19",
      status: "reached_out",
      created_at: "2026-10-15T15:00:00.000Z",
    },
  ];
}

// Kept on globalThis so dev-server hot reloads don't wipe it.
const g = globalThis as unknown as { __mockContacts?: Contact[] };
const book = () => (g.__mockContacts ??= seed());

function find(id: string) {
  const contact = book().find((c) => c.id === id);
  if (!contact) throw new Error("Contact not found");
  return contact;
}

export const mockContactsStore = {
  list(): Contact[] {
    return [...book()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  count(): number {
    return book().length;
  },
  get(id: string): Contact | undefined {
    return book().find((c) => c.id === id);
  },
  /** Search-result ids that are already saved. */
  personIds(): string[] {
    return book().flatMap((c) => (c.person_id ? [c.person_id] : []));
  },
  insert(person: PersonProfile, extra: { person_id: string | null; details: ContactDetails }): Contact {
    const existing = extra.person_id && book().find((c) => c.person_id === extra.person_id);
    if (existing) return existing;
    const contact: Contact = {
      ...person,
      ...extra,
      id: crypto.randomUUID(),
      status: "to_contact",
      notes: null,
      last_contacted: null,
      created_at: new Date().toISOString(),
    };
    book().push(contact);
    return contact;
  },
  update(id: string, changes: ContactUpdate): Contact {
    return Object.assign(find(id), changes);
  },
  remove(id: string): void {
    g.__mockContacts = book().filter((c) => c.id !== id);
  },
};
