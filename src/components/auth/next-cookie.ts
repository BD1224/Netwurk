/**
 * Where /auth/callback should go after an emailed link signs someone in (default: /discover).
 * Set by "Forgot password?" so the reset link lands on /set-password. Short-lived, read once.
 */
export const NEXT_COOKIE = "nf_auth_next";

/** Only same-site paths, never "//evil.com" or a full URL. */
export function safeNextPath(value: string | undefined | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}
