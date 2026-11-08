// GitHub helpers shared by server and browser code.

/** "https://github.com/octocat" -> "octocat". Anything that isn't a github.com profile -> null. */
export function githubUsername(url: string | null): string | null {
  if (!url) return null;
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "github.com" && hostname !== "www.github.com") return null;
    const name = pathname.split("/").filter(Boolean)[0];
    return name && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(name) ? name : null;
  } catch {
    return null;
  }
}
