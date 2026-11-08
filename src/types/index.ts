// Shared types used by BOTH frontend and backend (Zod schemas + inferred TS types).
// PersonProfile fields are placeholders until the spreadsheet columns are decided.
import { z } from "zod";

export const SearchCriteria = z.object({
  companies: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  universities: z.array(z.string()).optional(),
  researchAreas: z.array(z.string()).optional(),
  freeText: z.string().optional(),
});
export type SearchCriteria = z.infer<typeof SearchCriteria>;

export const EmailStatus = z.enum(["confirmed", "guessed"]);
export type EmailStatus = z.infer<typeof EmailStatus>;

// what the orchestrator hands to each researcher
export const Candidate = z.object({
  name: z.string(),
  title: z.string().nullable(),
  org: z.string().nullable(),
  urls: z.array(z.string()),
});
export type Candidate = z.infer<typeof Candidate>;

export const PersonProfile = z.object({
  fullName: z.string().min(1),
  title: z.string().nullable(),
  company: z.string().nullable(),
  university: z.string().nullable(),
  location: z.string().nullable(),
  email: z.string().nullable(),
  emailStatus: EmailStatus.nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  personalSite: z.string().nullable(),
  // not saved to the database; used to match the person on OpenAlex
  scholarUrl: z.string().nullish(),
  orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/).nullish(),
  researchAreas: z.array(z.string()),
  talkingPoints: z.string(),
  sources: z.array(z.string()),
  // A professional photo: their own site, a team/lab page, GitHub or Gravatar (never LinkedIn).
  // Found after research (services/agents/photos.ts); saved in contacts.photo_url.
  photoUrl: z.string().nullish(),
});
export type PersonProfile = z.infer<typeof PersonProfile>;

// what the researcher sends back: a profile plus two checks we use to drop
// people we're unsure about. The checks are never saved or shown.
export const ResearchResult = PersonProfile.extend({
  confidence: z.enum(["high", "low"]),
  matchesSearch: z.boolean(),
});

export const ContactStatus = z.enum(["to_contact", "reached_out", "replied", "met"]);
export type ContactStatus = z.infer<typeof ContactStatus>;

export type Contact = PersonProfile & {
  id: string;
  status: ContactStatus;
  notes: string | null;
  // OpenAlex author id, saved after the first papers lookup.
  // null = not looked up yet, "none" (NO_OPENALEX_MATCH) = looked up, no match.
  openalexId: string | null;
  createdAt: string;
};

export type SearchEvent =
  | { type: "found"; count: number } // how many candidates are being researched
  | { type: "person"; person: PersonProfile }
  | { type: "done"; count: number }
  | { type: "error"; message: string };

// A search result as the UI holds it: the profile plus a browser-made key
// (lists, "already saved" tracking). Never sent to the server.
export type SearchResult = PersonProfile & { key: string };

// A list that may still be loading, or have failed to load (repos, papers).
export type Loadable<T> = T[] | "loading" | "error";

// ---------- GitHub repos (fetched in the browser from api.github.com) ----------

export type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string; // ISO timestamp
  url: string;
};

// ---------- Papers (POST /api/papers, from OpenAlex) ----------

// Saved in place of an id when the lookup found no matching author, so we don't look again.
export const NO_OPENALEX_MATCH = "none";
export const OpenAlexId = z.union([z.string().regex(/^A\d+$/), z.literal(NO_OPENALEX_MATCH)]);

// Body: the person, plus their OpenAlex id if we already matched them once.
export const PapersRequest = z.object({
  person: PersonProfile,
  openalexId: OpenAlexId.nullish(),
});
export type PapersRequest = z.infer<typeof PapersRequest>;

export type Paper = {
  title: string;
  year: number | null;
  venue: string | null;
  url: string | null;
};

// openalexId "none" = no matching author found (e.g. most industry people).
export type PapersResult = {
  openalexId: string;
  profileUrl: string | null; // their OpenAlex page
  orcidUrl: string | null;
  papers: Paper[]; // newest first, up to 5
};
