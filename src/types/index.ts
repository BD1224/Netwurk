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
  researchAreas: z.array(z.string()),
  talkingPoints: z.string(),
  sources: z.array(z.string()),
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
  createdAt: string;
};

export type SearchEvent =
  | { type: "person"; person: PersonProfile }
  | { type: "done"; count: number }
  | { type: "error"; message: string };
