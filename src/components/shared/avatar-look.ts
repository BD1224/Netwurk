// Gives every contact a stable illustrated look, derived from a seed (their id).
import type { AvatarLook, HairStyle } from "./IllustratedAvatar";

const BACKGROUNDS = ["#E0E7FF", "#FCE7F3", "#ECFCCB", "#CFFAFE", "#FFE4E6", "#DCFCE7", "#FEF3C7", "#E0F2FE", "#FFEDD5", "#FAE8FF"];
const SKINS = ["#F6D2B8", "#EDB98A", "#D08B5B", "#A0643C", "#6B4226"];
const SHIRTS = ["#4F46E5", "#E11D48", "#64748B", "#18181B", "#10B981", "#A855F7", "#0EA5E9", "#F97316"];
const HAIRS: HairStyle[] = ["short", "long", "bun", "short", "long", "none"];
const HAIR_COLORS = ["#1C1917", "#3B2416", "#7A4A2A", "#D9A55B", "#1C1917"];

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function avatarLook(seed: string): AvatarLook {
  const h = hash(seed);
  const pick = <T,>(list: T[], shift: number) => list[(h >>> shift) % list.length];
  return {
    bg: pick(BACKGROUNDS, 0),
    skin: pick(SKINS, 5),
    shirt: pick(SHIRTS, 10),
    hair: pick(HAIRS, 15),
    hairColor: pick(HAIR_COLORS, 20),
  };
}
