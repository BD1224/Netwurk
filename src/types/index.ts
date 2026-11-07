// Shared types used by BOTH frontend and backend (Zod schemas + inferred TS types).
// PersonProfile fields are placeholders until the spreadsheet columns are finalized.
// Still to add: SearchCriteria, SearchEvent.
import { z } from "zod";

export const EmailStatus = z.enum(["confirmed", "guessed"]);
export type EmailStatus = z.infer<typeof EmailStatus>;

export const ContactStatus = z.enum(["to_contact", "reached_out", "replied", "met"]);
export type ContactStatus = z.infer<typeof ContactStatus>;

// One person found by a search (one spreadsheet row). Only fullName is required.
export const PersonProfile = z.object({
  fullName: z.string().min(1),
  title: z.string().nullish(),
  company: z.string().nullish(),
  university: z.string().nullish(),
  location: z.string().nullish(),
  email: z.string().nullish(),
  emailStatus: EmailStatus.nullish(),
  linkedinUrl: z.string().nullish(),
  githubUrl: z.string().nullish(),
  personalSite: z.string().nullish(),
  researchAreas: z.array(z.string()).nullish(),
  talkingPoints: z.string().nullish(),
  sources: z.array(z.string()).nullish(),
});
export type PersonProfile = z.infer<typeof PersonProfile>;

// A saved person in the user's contact book.
export type Contact = PersonProfile & {
  id: string;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
};
