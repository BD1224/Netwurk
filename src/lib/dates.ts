// Helpers for "YYYY-MM-DD" calendar dates (Postgres `date`), always in the user's local time.

/** Today's local date as "YYYY-MM-DD". */
export function todayISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-10-28" -> "Oct 28" (adds the year when it isn't this year); today -> "Today". */
export function formatShortDate(iso: string, now = new Date()): string {
  if (iso === todayISO(now)) return "Today";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(y !== now.getFullYear() && { year: "numeric" }),
  });
}
