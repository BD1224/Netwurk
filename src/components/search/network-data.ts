// Layout of the NetworkBackground: 20 made-up people placed on a 1440x900 design canvas.
// The canvas is stretched to fill the viewport, so x/y are really proportions (x / 1440, y / 900).
// The middle (headline + filter bar) is left clear.

import type { AvatarLook } from "@/components/shared/IllustratedAvatar";

export type NetworkNode = AvatarLook & {
  x: number; // center, px on the 1440x900 canvas
  y: number;
  size: number; // diameter, px
};

const SKIN = { light: "#F6D2B8", peach: "#EDB98A", tan: "#D08B5B", brown: "#A0643C", deep: "#6B4226" };
const HAIR = { black: "#1C1917", dark: "#3B2416", brown: "#7A4A2A", blond: "#D9A55B", grey: "#A1A1AA" };

export const CANVAS = { width: 1440, height: 900 };

export const NODES: NetworkNode[] = [
  { x: 80, y: 170, size: 56, bg: "#E0E7FF", shirt: "#4F46E5", skin: SKIN.light, hair: "short", hairColor: HAIR.brown },
  { x: 300, y: 119, size: 44, bg: "#FCE7F3", shirt: "#E11D48", skin: SKIN.deep, hair: "bun", hairColor: HAIR.black },
  { x: 540, y: 149, size: 40, bg: "#ECFCCB", shirt: "#64748B", skin: SKIN.brown, hair: "short", hairColor: HAIR.black },
  { x: 719, y: 109, size: 48, bg: "#CFFAFE", shirt: "#4F46E5", skin: SKIN.peach, hair: "long", hairColor: HAIR.brown },
  { x: 900, y: 159, size: 42, bg: "#FFE4E6", shirt: "#18181B", skin: SKIN.light, hair: "short", hairColor: HAIR.grey },
  { x: 1139, y: 129, size: 48, bg: "#E0E7FF", shirt: "#E11D48", skin: SKIN.tan, hair: "long", hairColor: HAIR.black },
  { x: 1360, y: 190, size: 48, bg: "#DCFCE7", shirt: "#10B981", skin: SKIN.light, hair: "short", hairColor: HAIR.brown },
  { x: 190, y: 330, size: 64, bg: "#D1FAE5", shirt: "#10B981", skin: SKIN.peach, hair: "long", hairColor: HAIR.black },
  { x: 1249, y: 339, size: 64, bg: "#FAE8FF", shirt: "#A855F7", skin: SKIN.brown, hair: "bun", hairColor: HAIR.black },
  { x: 70, y: 500, size: 48, bg: "#FEF9C3", shirt: "#18181B", skin: SKIN.tan, hair: "short", hairColor: HAIR.black },
  { x: 1370, y: 520, size: 44, bg: "#FEF3C7", shirt: "#64748B", skin: SKIN.peach, hair: "none", hairColor: HAIR.black },
  { x: 230, y: 640, size: 56, bg: "#E0F2FE", shirt: "#0EA5E9", skin: SKIN.light, hair: "long", hairColor: HAIR.blond },
  { x: 1209, y: 649, size: 56, bg: "#E0F2FE", shirt: "#F97316", skin: SKIN.deep, hair: "short", hairColor: HAIR.black },
  { x: 699, y: 679, size: 38, bg: "#FFE4E6", shirt: "#10B981", skin: SKIN.peach, hair: "short", hairColor: HAIR.brown },
  { x: 90, y: 799, size: 44, bg: "#FAE8FF", shirt: "#A855F7", skin: SKIN.brown, hair: "none", hairColor: HAIR.black },
  { x: 360, y: 819, size: 54, bg: "#FFEDD5", shirt: "#F97316", skin: SKIN.light, hair: "bun", hairColor: HAIR.brown },
  { x: 559, y: 799, size: 44, bg: "#FFEDD5", shirt: "#18181B", skin: SKIN.light, hair: "long", hairColor: HAIR.black },
  { x: 829, y: 848, size: 48, bg: "#CFFAFE", shirt: "#E11D48", skin: SKIN.brown, hair: "bun", hairColor: HAIR.black },
  { x: 1079, y: 819, size: 44, bg: "#ECFCCB", shirt: "#4F46E5", skin: SKIN.tan, hair: "short", hairColor: HAIR.dark },
  { x: 1350, y: 799, size: 48, bg: "#FAE8FF", shirt: "#0EA5E9", skin: SKIN.light, hair: "long", hairColor: HAIR.blond },
];

/** Connections between nodes, as [fromIndex, toIndex]. */
export const LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  [0, 7], [1, 7], [7, 9], [7, 11], [9, 11],
  [11, 14], [11, 15], [14, 15], [15, 16], [16, 13], [13, 17], [16, 17], [17, 18],
  [18, 12], [12, 8], [8, 5], [8, 6], [8, 10], [10, 12], [10, 19], [12, 19],
];

/** Lines that run from an outer node off the edge of the screen: [nodeIndex, x, y] (x/y outside the canvas). */
export const EDGE_LINES: [number, number, number][] = [
  [0, -80, 40], [0, -80, 300], [9, -80, 560], [14, -80, 720], [14, 20, 980],
  [1, 230, -80], [3, 780, -80], [5, 1220, -80], [6, 1520, 60],
  [6, 1520, 300], [10, 1520, 470], [19, 1520, 760], [19, 1420, 980],
  [15, 300, 980], [16, 600, 980], [17, 880, 980], [18, 1130, 980],
];

type Point = { x: number; y: number };

/** Every line to draw (connections first, then edge lines), as canvas-space point pairs. */
export const SEGMENTS: [Point, Point][] = [
  ...LINES.map(([a, b]): [Point, Point] => [NODES[a], NODES[b]]),
  ...EDGE_LINES.map(([n, x, y]): [Point, Point] => [{ x, y }, NODES[n]]),
];

/** Segments (indexes into SEGMENTS) that carry a travelling "message" dot. */
export const DOT_LINES = [1, 7, 10, 16, 20, 23, 25, 4, 28, 33, 36, 41];

/** Order in which avatars light up as "found", 3 per completed search step. */
export const FOUND = [7, 8, 3, 11, 12, 0, 17, 5, 15, 19, 9, 1];
export const FOUND_PER_STEP = 3;
