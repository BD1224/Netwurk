"use server";
// Checks the beta passcode and, if it's right, remembers it in a cookie for 90 days.
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { BETA_COOKIE, BETA_COOKIE_MAX_AGE, betaToken, safeNext } from "@/lib/beta";

/** next: where to go once the passcode is accepted (the browser navigates there, so the
 *  sign-in check in src/proxy.ts runs for it). */
export type BetaState = { error: string | null; next?: string };

export async function enterBeta(_prev: BetaState, form: FormData): Promise<BetaState> {
  const expected = process.env.BETA_PASSCODE;
  const next = safeNext(form.get("next"));
  if (!expected) return { error: null, next }; // gate is off

  const given = String(form.get("passcode") ?? "").trim();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 600)); // slows down guessing
    return { error: "That passcode isn't right." };
  }

  (await cookies()).set(BETA_COOKIE, (await betaToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BETA_COOKIE_MAX_AGE,
  });
  return { error: null, next };
}
