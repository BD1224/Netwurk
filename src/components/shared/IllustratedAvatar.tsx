// A person drawn in SVG: pastel circle, shoulders, neck, head, optional hair.
// Used by the Discover network background and the contact book.
import { useId } from "react";

export type HairStyle = "short" | "long" | "bun" | "none";

export type AvatarLook = { bg: string; shirt: string; skin: string; hair: HairStyle; hairColor: string };

type Props = AvatarLook & { size: number };

export function IllustratedAvatar({ size, bg, shirt, skin, hair, hairColor }: Props) {
  const clipId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="64" height="64" fill={bg} />
        {/* long hair sits behind the head and shoulders */}
        {hair === "long" && <path d="M20 28c0-9 5-14 12-14s12 5 12 14v14H20z" fill={hairColor} />}
        <path d="M10 66c0-13 9-20 22-20s22 7 22 20z" fill={shirt} />
        <rect x="28" y="36" width="8" height="11" rx="3" fill={skin} />
        <circle cx="32" cy="28" r="10" fill={skin} />
        {hair === "short" && (
          <path d="M21.5 27c0-7 4.5-11 10.5-11s10.5 4 10.5 11c-2-4-5.5-6-10.5-6s-8.5 2-10.5 6z" fill={hairColor} />
        )}
        {hair === "long" && (
          <path d="M21.5 27c0-7 4.5-11 10.5-11s10.5 4 10.5 11c-3-3-7-5-10.5-5s-7.5 2-10.5 5z" fill={hairColor} />
        )}
        {hair === "bun" && (
          <>
            <circle cx="32" cy="14.5" r="4.5" fill={hairColor} />
            <path d="M21.5 26c0-6 4.5-9.5 10.5-9.5s10.5 3.5 10.5 9.5c-2.5-3-6-4.5-10.5-4.5s-8 1.5-10.5 4.5z" fill={hairColor} />
          </>
        )}
      </g>
    </svg>
  );
}
