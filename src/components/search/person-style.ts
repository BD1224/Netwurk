// Initials avatar colours for search results, shared by the card and the details overlay.

// [background, text] pairs; every text color is >= 4.5:1 on its background.
const AVATAR_COLORS: [string, string][] = [
  ["#E0E7FF", "#3730A3"],
  ["#FCE7F3", "#9D174D"],
  ["#DCFCE7", "#166534"],
  ["#FEF3C7", "#92400E"],
  ["#E0F2FE", "#075985"],
  ["#FAE8FF", "#86198F"],
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** [background, text] for a person, stable per name. */
export function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const joinDot = (...parts: (string | null)[]) => parts.filter(Boolean).join(" · ");
