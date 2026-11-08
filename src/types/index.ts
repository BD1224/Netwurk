// Shared types used by BOTH frontend and backend (Zod schemas + inferred TS types):
// SearchCriteria, EmailStatus, PersonProfile, SearchPerson, PersonDetails, ContactStatus, Contact, SearchEvent.
// Field names are snake_case so they map 1:1 onto the `contacts` table columns.
import { z } from "zod";

// ---------- Search input (the five typed fields on the filter bar) ----------

const filterText = z.string().trim().max(120).optional();

export const SearchCriteriaSchema = z
  .object({
    title: filterText,
    company: filterText,
    university: filterText,
    location: filterText,
    research: filterText,
  })
  .refine((c) => Object.values(c).some((v) => v && v.length > 0), {
    message: "Fill at least one field",
  });
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;
export type SearchField = keyof SearchCriteria;

// ---------- Person (one search result) ----------

export const EmailStatusSchema = z.enum(["confirmed", "guessed"]);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

const optionalText = z.string().nullable().default(null);
// The DB columns are nullable text[]; the app always sees an array.
const textList = z
  .array(z.string())
  .nullish()
  .transform((v) => v ?? []);

export const PersonProfileSchema = z.object({
  full_name: z.string().min(1),
  title: optionalText,
  company: optionalText,
  university: optionalText,
  location: optionalText,
  email: optionalText,
  email_status: EmailStatusSchema.nullable().default(null),
  linkedin_url: optionalText,
  github_url: optionalText,
  personal_site: optionalText,
  research_areas: textList,
  talking_points: optionalText,
  sources: textList,
  /** A professional photo URL: team/lab page, their own site or GitHub avatar (never LinkedIn). */
  photo_url: z.string().url().nullish(),
  /** Google Scholar profile and ORCID iD (researchers). Used to find their papers on OpenAlex.
   *  Saved contacts keep these in `details` (no table columns). */
  scholar_url: z.string().url().nullish(),
  orcid: z.string().nullish(),
});
export type PersonProfile = z.infer<typeof PersonProfileSchema>;

/** A search result: a profile plus an id the details endpoint and ?person= links use. */
export const SearchPersonSchema = PersonProfileSchema.extend({
  id: z.string().regex(/^[\w-]{1,64}$/),
});
export type SearchPerson = z.infer<typeof SearchPersonSchema>;

// ---------- Person details (GET /api/people/[id]/details) ----------

export const RepoSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  pushed_at: z.string(),
  url: z.string().url(),
});
export type Repo = z.infer<typeof RepoSchema>;

export const PaperSchema = z.object({
  title: z.string(),
  venue: z.string().nullable(),
  year: z.number().int().nullable(),
  url: z.string().url().nullable(),
});
export type Paper = z.infer<typeof PaperSchema>;

export const SourceLinkSchema = z.object({ label: z.string(), url: z.string().url() });
export type SourceLink = z.infer<typeof SourceLinkSchema>;

export const PersonDetailsSchema = z.object({
  /** The profile itself, so a shared ?person= link can open without the search results. */
  person: SearchPersonSchema,
  talking_points: z.string().nullable(),
  /** Up to 5 most recently pushed public repos (GitHub REST). */
  repos: z.array(RepoSchema),
  papers: z.array(PaperSchema),
  accolades: z.array(z.string()),
  sources: z.array(SourceLinkSchema),
  /** OpenAlex author id the papers came from, or "none" (looked up, no match). */
  openalex_id: z.string().nullish(),
});
export type PersonDetails = z.infer<typeof PersonDetailsSchema>;

// ---------- Saved contact (a row in `contacts`) ----------

export const ContactStatusSchema = z.enum(["to_contact", "reached_out", "replied", "met"]);
export type ContactStatus = z.infer<typeof ContactStatusSchema>;

/** A calendar date, "YYYY-MM-DD" (Postgres `date`). */
export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** What the search agent found about a saved person, copied onto the contact when it's saved. */
export const ContactDetailsSchema = z.object({
  /** Snapshot from save time; the contact page refreshes it live from GitHub when it can. */
  repos: z.array(RepoSchema).default([]),
  papers: z.array(PaperSchema).default([]),
  accolades: z.array(z.string()).default([]),
  sources: z.array(SourceLinkSchema).default([]),
  scholar_url: z.string().url().nullish(),
  orcid: z.string().nullish(),
  /** OpenAlex author id once matched, "none" if no match (so it isn't looked up again). */
  openalex_id: z.string().nullish(),
});
export type ContactDetails = z.infer<typeof ContactDetailsSchema>;

export const ContactSchema = PersonProfileSchema.extend({
  id: z.string().uuid(),
  /** The search result this contact was saved from (lets Discover show it as already saved). */
  person_id: z.string().nullable().default(null),
  details: ContactDetailsSchema.prefault({}),
  status: ContactStatusSchema,
  notes: z.string().nullable(),
  /** null = never contacted ("To reach out"). */
  last_contacted: DateOnlySchema.nullable().default(null),
  created_at: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

/** The fields a user may edit on a saved contact. */
export const ContactUpdateSchema = z
  .object({
    notes: z.string().max(5000).nullable().optional(),
    status: ContactStatusSchema.optional(),
    last_contacted: DateOnlySchema.nullable().optional(),
  })
  .strict();
export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;

// ---------- Streaming events from POST /api/search ----------
// The route sends newline-delimited JSON (NDJSON): one SearchEvent per line.

/** The four progress steps shown under the filter bar, in order. */
export const SEARCH_STEPS = ["Web search", "GitHub", "Google Scholar", "Checking emails"] as const;

export const SearchEventSchema = z.discriminatedUnion("type", [
  /** Step `step` is now running; every step before it is done. */
  z.object({ type: z.literal("step"), step: z.number().int().min(0).max(SEARCH_STEPS.length - 1) }),
  /** How many candidates the agent is researching (sizes the skeleton cards). */
  z.object({ type: z.literal("found"), count: z.number().int().nonnegative() }),
  z.object({ type: z.literal("person"), person: SearchPersonSchema }),
  /** Every step is done; `count` people were sent. */
  z.object({ type: z.literal("done"), count: z.number().int().nonnegative() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type SearchEvent = z.infer<typeof SearchEventSchema>;
