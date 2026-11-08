import "server-only";
// Translates between the app and Simon's agent (src/services/agents/), which use different shapes:
//   app filter bar  { title, company, ... }       -> agent { roles: [...], companies: [...], ... }
//   agent profile   { fullName, githubUrl, ... }  -> app SearchPerson { id, full_name, github_url, ... }
import { createHash } from "node:crypto";
import { SearchPersonSchema, type SearchCriteria, type SearchPerson, type SourceLink } from "@/types";
import type { SearchCriteria as AgentCriteria, PersonProfile as AgentProfile } from "./types";

export function toAgentCriteria(c: SearchCriteria): AgentCriteria {
  const one = (v?: string) => (v && v.trim() ? [v.trim()] : undefined);
  return {
    roles: one(c.title),
    companies: one(c.company),
    universities: one(c.university),
    states: one(c.location),
    researchAreas: one(c.research),
  };
}

const httpUrl = (v: string | null) => {
  if (!v) return null;
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

/** Stable id from name + company, so the same person gets the same id (and ?person= link) every search. */
function personId(p: AgentProfile) {
  const slug = p.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const hash = createHash("sha1")
    .update(`${p.fullName}|${p.company ?? ""}`.toLowerCase())
    .digest("hex")
    .slice(0, 8);
  return `${slug || "person"}-${hash}`;
}

/** null if the agent's profile can't be turned into a valid search result. */
export function toSearchPerson(p: AgentProfile): SearchPerson | null {
  const parsed = SearchPersonSchema.safeParse({
    id: personId(p),
    full_name: p.fullName.trim(),
    title: p.title,
    company: p.company,
    university: p.university,
    location: p.location,
    email: p.email,
    email_status: p.email ? p.emailStatus : null,
    linkedin_url: httpUrl(p.linkedinUrl),
    github_url: httpUrl(p.githubUrl),
    personal_site: httpUrl(p.personalSite),
    research_areas: p.researchAreas,
    // The agent separates talking points with "; ", the app with newlines.
    talking_points:
      p.talkingPoints
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean)
        .join("\n") || null,
    sources: [...new Set(p.sources.flatMap((s) => httpUrl(s) ?? []))],
  });
  return parsed.success ? parsed.data : null;
}

/** "Dr. Jane Q. Doe" -> "jane doe": first + last name, to spot the same person across searches. */
export function nameKey(fullName: string) {
  const parts = fullName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(dr|prof|mr|ms|mrs|jr|sr|phd)\b\.?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

/** Source URLs as labelled links ("github.com", ...) for the details overlay. */
export function sourceLinks(urls: string[]): SourceLink[] {
  return urls.flatMap((u) => {
    const href = httpUrl(u);
    return href ? [{ label: new URL(href).hostname.replace(/^www\./, ""), url: href }] : [];
  });
}
