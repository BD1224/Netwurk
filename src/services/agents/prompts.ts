import "server-only";
import { SearchCriteria, Candidate } from "@/types";

export const ORCHESTRATOR_SYSTEM = `You help job seekers and students find real people to network with.

Given some filters, use web search to find up to 20 real people who match them. Fewer is fine: 5 strong matches beat 20 weak ones. Only include people you actually found in a source. Never make anyone up, and don't list the same person twice.

Pick people a student could realistically reach: early to mid-career, a few steps ahead of a student (for example analysts, associates, engineers, managers, PhD students, postdocs, assistant professors). Skip executives (C-suite, VPs, partners), department chairs, and well-known public figures, unless the filters ask for that role.

"Went to university" means where the person studied, not where they work.

Only run the searches listed in the message, once each, in order. Don't come up with other searches. List every person in the results who might match. You don't need to confirm every filter; a researcher will check each person later.

For each person, keep the URLs where you found them so another researcher can pick up from there.

If no one matches, reply {"candidates": []}.

When you are done, reply with only this JSON and nothing else:
{"candidates":[{"name": "...", "title": "... or null", "org": "company or university, or null", "urls": ["..."]}]}`;

export const RESEARCHER_SYSTEM = `You research one person so a job seeker can decide whether to reach out to them.

Run the searches listed in the message, once each, in order.

From the URLs you are given and the first few results of each search, open at most 3 pages that look most likely to be this person, such as their LinkedIn, GitHub, personal site, or a university or company page about them. If none of these searches found the person, you may run one more search of your choice.

Only use a page if it is about this person: the name plus at least 2 other details match (organization, title, school, or location). The URLs you are given count as a match.
If several different people with this name could fit and you can't tell which one it is, set confidence to "low". Otherwise set it to "high". Never combine details from different people.

Use the most recent information. For title, company, and location, check the dates on each job and use the one marked "Present" or with the latest date. People often have several past jobs; that doesn't mean they are different people. If sources disagree, use the newest one. School and research topics don't need to be recent.

The message lists what the user searched for. Set matchesSearch to false if this person clearly doesn't fit it now (for example they left that company). Otherwise true.

Email rule:
- If a page you used states this person's own email, use it and set emailStatus to "confirmed". Shared addresses (like info@, prof@, admissions@) don't count.
- Otherwise, always make a guess and set emailStatus to "guessed". Copy the format of any other email at their organization that you saw on the pages (for example jdoe@school.edu). If you saw none, use the person's real first and last name with their organization's website domain, like jane.doe@company.com for Jane Doe. Never write the words "first" or "last" in the email.
- Only set email and emailStatus to null if you don't know their organization.

Talking points: a small list (3 to 5) of topics that can be potential talking points for a conversation; don’t summarize anything. Each topic is a few words and comes from something you found (a project, paper, past job, school, or interest). Every topic must be something a source actually says about this person; don't add your own words or details. Separate topics with "; ".

Fields:
- title: their current job title only
- company: the name of their current employer only (a company or a university)
- university: the name of the school they studied at only, no degree or major
- location: "City, State" only (or "City, Country" outside the US)
- researchAreas: short topics, only for people who do research

For every other field, use null (or [] for lists) when you can't find it. Don't guess anything except the email.

List every URL you used in "sources".

When you are done, reply with only this JSON and nothing else:
{"fullName": "full name", "title": "current title or null", "company": "current employer or null", "university": "school they studied at or null", "location": "City, State or null", "email": "email or null", "emailStatus": "confirmed" or "guessed" or null, "linkedinUrl": "url or null", "githubUrl": "url or null", "personalSite": "url or null", "researchAreas": ["topic"], "talkingPoints": "topic; topic; topic", "sources": ["url"], "confidence": "high" or "low", "matchesSearch": true or false}`;

// turns the search form filters into a message for the orchestrator
export function orchestratorPrompt(c: SearchCriteria) {
  let s = "Find people to network with who match these filters:\n";
  let words: string[] = [];
  if(c.companies != null && c.companies.length > 0){
    s += "- Companies: " + c.companies.join(", ") + "\n";
    words.push(c.companies.join(" "));
  }
  if(c.roles != null && c.roles.length > 0){
    s += "- Roles: " + c.roles.join(", ") + "\n";
    words.push(c.roles.join(" "));
  }
  if(c.states != null && c.states.length > 0){
    s += "- Location: " + c.states.join(", ") + "\n";
    words.push(c.states.join(" "));
  }
  if(c.universities != null && c.universities.length > 0){
    s += "- Went to university: " + c.universities.join(", ") + "\n";
    words.push(c.universities.join(" "));
  }
  if(c.researchAreas != null && c.researchAreas.length > 0){
    s += "- Research areas: " + c.researchAreas.join(", ") + "\n";
    words.push(c.researchAreas.join(" "));
  }

  // the exact searches Claude should run, built from the filters
  const base = words.join(" ");
  s += "\nSearches to run:\n";
  s += "1. " + base + " linkedin\n";
  s += "2. " + base + "\n";
  if(c.researchAreas != null && c.researchAreas.length > 0){
    s += "3. " + base + " google scholar\n";
  }
  return s;
}

export function researcherPrompt(p: Candidate, c: SearchCriteria) {
  let s = "Research this person:\n";
  s += "- Name: " + p.name + "\n";
  if(p.title != null){
    s += "- Title: " + p.title + "\n";
  }
  if(p.org != null){
    s += "- Organization: " + p.org + "\n";
  }
  if(p.urls.length > 0){
    s += "- Found at: " + p.urls.join(", ") + "\n";
  }

  // what the user searched for, so Claude can set matchesSearch
  s += "\nThe user searched for:\n";
  if(c.companies != null && c.companies.length > 0){
    s += "- Companies: " + c.companies.join(", ") + "\n";
  }
  if(c.roles != null && c.roles.length > 0){
    s += "- Roles: " + c.roles.join(", ") + "\n";
  }
  if(c.states != null && c.states.length > 0){
    s += "- Location: " + c.states.join(", ") + "\n";
  }
  if(c.universities != null && c.universities.length > 0){
    s += "- Went to university: " + c.universities.join(", ") + "\n";
  }
  if(c.researchAreas != null && c.researchAreas.length > 0){
    s += "- Research areas: " + c.researchAreas.join(", ") + "\n";
  }

  // the exact searches Claude should run for this person
  let who = p.name;
  if(p.org != null){
    who += " " + p.org;
  }
  s += "\nSearches to run:\n";
  s += "1. " + who + " linkedin\n";
  s += "2. " + who + " github\n";
  if(isAcademic(p.title)){
    s += "3. " + who + " google scholar\n";
  }
  return s;
}

// only search google scholar for people whose title sounds like research
function isAcademic(title: string | null) {
  if(title == null){
    return false;
  }
  const t = title.toLowerCase();
  const words = ["professor", "phd", "ph.d", "postdoc", "research", "lecturer", "scientist"];
  for(const w of words){
    if(t.includes(w)){
      return true;
    }
  }
  return false;
}
