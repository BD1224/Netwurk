import "server-only";
import { SearchCriteria, Candidate } from "@/types";
import { CallLog } from "@/lib/gemini";
import { serperSearch, SearchHit } from "@/lib/serper";

const MAX_PEOPLE = 20;
const MAX_ROUNDS = 5;
const MAX_QUERY_WORDS = 32; // Google ignores words past about 32

// Stage 1 (no Gemini, just Serper): filters -> up to 20 people.
// Searches LinkedIn through Serper. After each round, the people we already found
// are excluded with -"Name" so the next search shows new people.
// exclude: names the user has already been shown. They're excluded the same way (after the
// people found this search) and never returned, so every search brings new people.
export async function findCandidates(criteria: SearchCriteria, log?: CallLog, exclude: string[] = []) {
  const base = baseQuery(criteria);
  const found: Candidate[] = [];
  const seen = new Set(exclude.map(n => n.toLowerCase()));
  const seenNewestFirst = [...exclude].reverse();

  for(let round = 0; round < MAX_ROUNDS; round++){
    // newest names first, until the query would get too long
    let q = base + " site:linkedin.com/in";
    const names = [...found.map(f => f.name).reverse(), ...seenNewestFirst];
    for(const name of names){
      const add = ' -"' + name + '"';
      if((q + add).split(" ").length > MAX_QUERY_WORDS){
        break;
      }
      q += add;
    }

    const hits = await serperSearch(q, log);
    let added = 0;
    for(const h of hits){
      const c = parseLinkedIn(h, criteria);
      if(c != null && !seen.has(c.name.toLowerCase()) && !alreadyFound(found, c)){
        found.push(c);
        added++;
      }
    }
    if(added == 0 || found.length >= MAX_PEOPLE){
      break;
    }
  }

  // researchers usually have a Google Scholar page instead of a good LinkedIn
  if(criteria.researchAreas != null && criteria.researchAreas.length > 0 && found.length < MAX_PEOPLE){
    const hits = await serperSearch(base + " site:scholar.google.com", log);
    for(const h of hits){
      const c = parseScholar(h);
      if(c != null && !seen.has(c.name.toLowerCase()) && !alreadyFound(found, c)){
        found.push(c);
      }
    }
  }

  return found.slice(0, MAX_PEOPLE);
}

// all the filters the user typed, joined into one search
function baseQuery(c: SearchCriteria) {
  let words: string[] = [];
  if(c.companies != null && c.companies.length > 0) words.push(c.companies.join(" "));
  if(c.roles != null && c.roles.length > 0) words.push(c.roles.join(" "));
  if(c.states != null && c.states.length > 0) words.push(c.states.join(" "));
  if(c.universities != null && c.universities.length > 0) words.push(c.universities.join(" "));
  if(c.researchAreas != null && c.researchAreas.length > 0) words.push(c.researchAreas.join(" "));
  return words.join(" ");
}

// LinkedIn result titles look like:
//   "Sarah Akbar - Software Engineer II @ Wayfair"
//   "Gautam Chatterjee - Software Engineer II at Wayfair"
//   "Jason Dale - Software Engineer - Wayfair"
//   "Max Freedman - Wayfair"
//   "Nathan Li - Boston, Massachusetts, United States"
function parseLinkedIn(h: SearchHit, criteria: SearchCriteria) {
  if(!h.link.includes("linkedin.com/in/")){
    return null;
  }
  let t = h.title.replace(/\s*\|\s*LinkedIn\s*$/i, "");
  t = t.split(" | ")[0];
  t = t.replace(" – ", " - ");

  const dash = t.indexOf(" - ");
  if(dash == -1){
    return null;
  }
  const name = t.substring(0, dash).trim();
  const rest = t.substring(dash + 3).trim();
  if(!looksLikeName(name)){
    return null;
  }

  let title: string | null = null;
  let org: string | null = null;
  if(rest.includes(" at ")){
    const k = rest.lastIndexOf(" at ");
    title = rest.substring(0, k).trim();
    org = rest.substring(k + 4).trim();
  } else if(rest.includes(" @ ")){
    const k = rest.lastIndexOf(" @ ");
    title = rest.substring(0, k).trim();
    org = rest.substring(k + 3).trim();
  } else if(rest.includes(" - ")){
    const k = rest.lastIndexOf(" - ");
    title = rest.substring(0, k).trim();
    org = rest.substring(k + 3).trim();
  } else if(!rest.includes(",")){
    // just one phrase: it's the company if it matches the company searched for
    // ("Max Freedman - Wayfair"), otherwise it's the title ("Hannah Dewey - Marine Biologist")
    if(isSearchedCompany(rest, criteria)){
      org = rest;
    } else {
      title = rest;
    }
  }
  // a comma with no "at"/"@"/"-" is usually a location, so we leave both null

  return { name: name, title: cleanCut(title), org: cleanCut(org), urls: [cleanUrl(h.link)] };
}

// Google Scholar profile titles look like "Dmitry Taubinsky - Google Scholar"
function parseScholar(h: SearchHit) {
  if(!h.link.includes("scholar.google.com/citations")){
    return null;
  }
  const dash = h.title.indexOf(" - Google Scholar");
  if(dash == -1){
    return null;
  }
  const name = h.title.substring(0, dash).trim();
  if(!looksLikeName(name)){
    return null;
  }
  return { name: name, title: null, org: null, urls: [h.link] };
}

function isSearchedCompany(s: string, c: SearchCriteria) {
  if(c.companies == null){
    return false;
  }
  const t = s.toLowerCase();
  for(const co of c.companies){
    const x = co.toLowerCase();
    if(t.includes(x) || x.includes(t)){
      return true;
    }
  }
  return false;
}

// Google cuts long titles with "..." ("Software Engineer and Scrum ..."), so drop that part
function cleanCut(s: string | null) {
  if(s == null){
    return null;
  }
  let t = s.replace(/\s*(\.\.\.|…)\s*$/, "").trim();
  if(t == ""){
    return null;
  }
  return t;
}

function looksLikeName(s: string) {
  const parts = s.split(" ");
  if(parts.length < 2 || parts.length > 5){
    return false;
  }
  if(/\d/.test(s)){
    return false;
  }
  const lower = s.toLowerCase();
  if(lower.includes("jobs") || lower.includes("hiring") || lower.includes("linkedin")){
    return false;
  }
  return true;
}

// same profile can show up as uk.linkedin.com/in/x/ or www.linkedin.com/in/x?trk=...
function cleanUrl(url: string) {
  let u = url.split("?")[0];
  if(u.endsWith("/")){
    u = u.substring(0, u.length - 1);
  }
  const k = u.indexOf("linkedin.com/in/");
  if(k != -1){
    u = "https://www." + u.substring(k);
  }
  return u;
}

function alreadyFound(found: Candidate[], c: Candidate) {
  for(const f of found){
    if(f.urls[0].toLowerCase() == c.urls[0].toLowerCase()){
      return true;
    }
    if(f.name.toLowerCase() == c.name.toLowerCase()){
      return true;
    }
  }
  return false;
}
