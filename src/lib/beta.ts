// Private-beta gate: when BETA_PASSCODE is set (on Vercel), every page needs the passcode first.
// Entering it stores a cookie holding a hash of the passcode (never the passcode itself), so
// changing BETA_PASSCODE locks everyone out until they enter the new one.
// Not set (e.g. local development) = no gate.

export const BETA_COOKIE = "nf_beta";
export const BETA_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const betaGateOn = () => Boolean(process.env.BETA_PASSCODE);

/** Paths that skip the gate: the gate itself, the privacy policy (Google needs it public), and
 *  emailed sign-in links (they may open in a browser that hasn't entered the passcode yet). */
export const skipsBetaGate = (path: string) =>
  ["/beta", "/privacy", "/auth"].some((p) => path === p || path.startsWith(`${p}/`));

/** What the cookie should hold for the current passcode. */
export async function betaToken(): Promise<string | null> {
  const passcode = process.env.BETA_PASSCODE;
  if (!passcode) return null;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`netwurk-beta:${passcode}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only same-site paths, so ?next= can't send people to another site. */
export const safeNext = (value: unknown) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/signin";
