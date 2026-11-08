import "server-only";
// Finds a professional photo for a person the agent researched, in this order:
//   1. a headshot on a page the agent already cited (team, lab, speaker page) whose alt text names them
//   2. their own website: a named headshot, else the site's og:image
//   3. the avatar on the GitHub profile the agent found
//   4. no GitHub found: a GitHub profile with their name that lists the same company
//      (its link is added to the person, with the profile as a source)
//   5. Gravatar, only for an email a public page confirmed is theirs
// GitHub's default pattern avatars and Gravatar placeholders are skipped: they aren't photos.
// Never LinkedIn: LinkedIn's terms forbid scraping, so we never fetch its pages or use its images
// (licdn.com). Same for social media and people-search / data-broker sites. Pages are only read
// when the site's robots.txt allows it. We store the image's URL only, never the image itself.
import { createHash } from "node:crypto";
import { githubUsername } from "@/lib/github";
import type { SearchPerson } from "@/types";

const USER_AGENT = "NetworkingFinderBot/0.1 (finds professional contacts; respects robots.txt)";
const MAX_PAGES = 3;
const MAX_HTML_BYTES = 1_000_000;

/** Never fetched, and their images never used. */
const BLOCKED_HOSTS = [
  "linkedin.com",
  "licdn.com",
  "facebook.com",
  "fbcdn.net",
  "instagram.com",
  "cdninstagram.com",
  "x.com",
  "twitter.com",
  "twimg.com",
  "tiktok.com",
  "tiktokcdn.com",
  "zoominfo.com",
  "rocketreach.co",
  "apify.com",
  "contactout.com",
  "signalhire.com",
  "lusha.com",
  "apollo.io",
  "spokeo.com",
  "whitepages.com",
  "beenverified.com",
  "radaris.com",
  "peoplefinders.com",
];
const NOT_A_PHOTO = /(logo|icon|sprite|favicon|banner|placeholder|default|blank|avatar-generic)/i;

const onBlockedHost = (url: URL) => {
  const host = url.hostname.toLowerCase();
  return BLOCKED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
};

function parseUrl(raw: string, base?: string): URL | null {
  try {
    const u = new URL(raw, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

function usableImage(raw: string | null): string | null {
  const u = raw ? parseUrl(raw) : null;
  if (!u || onBlockedHost(u) || NOT_A_PHOTO.test(u.pathname) || /\.svg$/i.test(u.pathname)) return null;
  // Gravatar's generated placeholders (patterns and silhouettes), not a real photo.
  if (/(^|\.)gravatar\.com$/.test(u.hostname) && /[?&](d|default)=(identicon|retro|mp|mm|wavatar|monsterid|robohash|blank)\b/.test(u.search)) return null;
  return u.href;
}

export type PhotoResult = {
  /** The photo's URL, or null if none was found. */
  photoUrl: string | null;
  /** A GitHub profile matched by name + company (when the agent didn't find one). */
  githubUrl: string | null;
  /** Where the photo came from, if it isn't already in the person's sources. */
  source: string | null;
};

export async function findPhoto(person: SearchPerson, signal?: AbortSignal): Promise<PhotoResult> {
  const none: PhotoResult = { photoUrl: null, githubUrl: null, source: null };
  const ownSite = person.personal_site ? parseUrl(person.personal_site) : null;
  const pages = [
    ...(ownSite ? [ownSite] : []),
    ...person.sources.flatMap((s) => parseUrl(s) ?? []),
  ].filter(
    (u, i, all) =>
      !onBlockedHost(u) &&
      !/(^|\.)github\.com$/.test(u.hostname) &&
      all.findIndex((x) => x.href === u.href) === i,
  );

  const read = await Promise.all(pages.slice(0, MAX_PAGES).map((u) => readHtml(u, signal)));
  // 1. A headshot that names them, on any page.
  for (const page of read) {
    const named = page && namedHeadshot(page.html, page.url, person.full_name);
    if (named) return { ...none, photoUrl: named };
  }
  // 2. Their own site's preview image.
  if (ownSite && read[0]) {
    const og = usableImage(ogImage(read[0].html, read[0].url));
    if (og) return { ...none, photoUrl: og };
  }
  // 3. The GitHub profile the agent found.
  const username = githubUsername(person.github_url);
  if (username) {
    const profile = await githubProfile(username, signal);
    const avatar = profile && (await realAvatar(profile.avatar_url, signal));
    if (avatar) return { ...none, photoUrl: avatar };
  }
  // 4. A GitHub profile with their name that lists the same company.
  if (!username) {
    const match = await githubByNameAndCompany(person, signal);
    if (match) {
      const avatar = await realAvatar(match.avatar_url, signal);
      return { photoUrl: avatar, githubUrl: match.html_url, source: match.html_url };
    }
  }
  // 5. Gravatar, only for an email a public page confirmed is theirs.
  if (person.email && person.email_status === "confirmed") {
    const gravatar = await gravatarPhoto(person.email, signal);
    if (gravatar) return { ...none, photoUrl: gravatar };
  }
  return none;
}

// ---------- GitHub ----------

type GitHubProfile = {
  login: string;
  html_url: string;
  avatar_url: string;
  name: string | null;
  company: string | null;
  bio: string | null;
};

const githubHeaders = () => {
  const token = process.env.GITHUB_TOKEN; // optional: raises GitHub's limits a lot
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "networking-finder",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function githubProfile(login: string, signal?: AbortSignal): Promise<GitHubProfile | null> {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: githubHeaders(),
      signal: withTimeout(signal, 5000),
    });
    return res.ok ? ((await res.json()) as GitHubProfile) : null;
  } catch {
    return null;
  }
}

/** Lowercase words, without "@", "inc", "llc" and the like: "@Stripe, Inc." -> "stripe". */
const companyWords = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["inc", "llc", "ltd", "corp", "co", "the", "company"].includes(w))
    .join(" ");

/**
 * Searches GitHub users by full name and keeps the first (of the top 3) whose profile lists the
 * same company in its company field or bio. Without that match it could be someone else.
 */
async function githubByNameAndCompany(person: SearchPerson, signal?: AbortSignal): Promise<GitHubProfile | null> {
  const company = person.company ? companyWords(person.company) : "";
  const parts = person.full_name.trim().split(/\s+/);
  // Needs a company to check against and a real first + last name (not "Tony C.").
  if (!company || parts.length < 2 || parts[parts.length - 1].replace(/\./g, "").length < 2) return null;
  try {
    const q = encodeURIComponent(`fullname:"${person.full_name}" type:user`);
    const res = await fetch(`https://api.github.com/search/users?q=${q}&per_page=3`, {
      headers: githubHeaders(),
      signal: withTimeout(signal, 5000),
    });
    if (!res.ok) return null; // includes GitHub's rate limit (403/429)
    const { items } = (await res.json()) as { items?: { login: string }[] };
    for (const item of items ?? []) {
      const profile = await githubProfile(item.login, signal);
      if (!profile) continue;
      const listed = companyWords(`${profile.company ?? ""} ${profile.bio ?? ""}`);
      if (` ${listed} `.includes(` ${company} `)) return profile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The avatar, unless it's GitHub's default pattern (identicon): those are small PNGs, while an
 * uploaded photo at 420px is a much bigger image.
 */
async function realAvatar(avatarUrl: string, signal?: AbortSignal): Promise<string | null> {
  const url = usableImage(avatarUrl);
  if (!url) return null;
  try {
    const sized = new URL(url);
    sized.searchParams.set("s", "420");
    const res = await fetch(sized, { signal: withTimeout(signal, 5000) });
    if (!res.ok) return null;
    const bytes = (await res.arrayBuffer()).byteLength;
    const png = (res.headers.get("content-type") ?? "").includes("png");
    return png && bytes < 10_000 ? null : url;
  } catch {
    return null;
  }
}

// ---------- Gravatar ----------

/** Their Gravatar photo, if they set one for this email (d=404: no placeholder). */
async function gravatarPhoto(email: string, signal?: AbortSignal): Promise<string | null> {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const url = `https://gravatar.com/avatar/${hash}?s=200&d=404`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: withTimeout(signal, 4000) });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

const withTimeout = (signal: AbortSignal | undefined, ms: number) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);

/** The page's HTML, or null if robots.txt disallows it, it fails, or it isn't HTML. */
async function readHtml(url: URL, signal?: AbortSignal): Promise<{ url: string; html: string } | null> {
  try {
    const robots = await fetch(`${url.origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: withTimeout(signal, 4000),
    }).catch(() => null);
    if (robots?.ok && !robotsAllows(await robots.text(), url.pathname || "/")) return null;
    if (robots && (robots.status === 401 || robots.status === 403)) return null;

    const res = await fetch(url.href, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: withTimeout(signal, 6000),
    });
    const finalUrl = parseUrl(res.url || url.href);
    if (!res.ok || !finalUrl || onBlockedHost(finalUrl)) return null;
    if (!/text\/html/.test(res.headers.get("content-type") ?? "")) return null;
    return { url: finalUrl.href, html: (await res.text()).slice(0, MAX_HTML_BYTES) };
  } catch {
    return null;
  }
}

const decodeEntities = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** An HTML attribute's value, with entities like &amp; decoded. */
const attr = (tag: string, name: string) => {
  const raw = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  return raw == null ? null : decodeEntities(raw);
};

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** An <img> whose alt text contains the person's first and last name. */
function namedHeadshot(html: string, pageUrl: string, fullName: string): string | null {
  const parts = fold(fullName).replace(/^(dr|prof|professor|mr|ms|mrs)\s+/, "").split(" ");
  if (parts.length < 2) return null;
  const first = parts[0];
  const last = parts[parts.length - 1];
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const alt = attr(tag, "alt");
    if (!alt || NOT_A_PHOTO.test(alt)) continue;
    const words = fold(alt).split(" ");
    if (!words.includes(first) || !words.includes(last)) continue;
    const src = attr(tag, "src") ?? attr(tag, "data-src");
    const url = src && !/^data:/i.test(src) ? parseUrl(src, pageUrl) : null;
    const usable = url && usableImage(url.href);
    if (usable) return usable;
  }
  return null;
}

function ogImage(html: string, pageUrl: string): string | null {
  const tag = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/i)?.[0];
  const content = tag && attr(tag, "content");
  return content ? (parseUrl(content, pageUrl)?.href ?? null) : null;
}

/** Minimal robots.txt check: rules for "*" (or our bot), longest matching prefix wins. */
function robotsAllows(robotsTxt: string, path: string): boolean {
  type Rule = { allow: boolean; prefix: string };
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const m = raw.replace(/#.*/, "").trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
    } else if (current && (key === "allow" || key === "disallow") && value) {
      current.rules.push({ allow: key === "allow", prefix: value.replace(/\*$/, "") });
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && "networkingfinderbot".includes(a)));
  const rules = (mine.length ? mine : groups.filter((g) => g.agents.includes("*"))).flatMap((g) => g.rules);
  let best: Rule | null = null;
  for (const r of rules) {
    if (path.startsWith(r.prefix) && (!best || r.prefix.length > best.prefix.length)) best = r;
  }
  return best ? best.allow : true;
}
