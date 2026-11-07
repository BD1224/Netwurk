"use client";
// One search result: initials avatar, name, role lines, up to 2 research tags,
// link icons, an email-status envelope, and a "+" button that saves to contacts.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { PersonProfile } from "@/types";
import {
  CheckIcon,
  GitHubIcon,
  GlobeIcon,
  LinkedInIcon,
  MailIcon,
  PlusIcon,
} from "@/components/shared/icons";

// [background, text] pairs; every text color is >= 4.5:1 on its background.
const AVATAR_COLORS: [string, string][] = [
  ["#E0E7FF", "#3730A3"],
  ["#FCE7F3", "#9D174D"],
  ["#DCFCE7", "#166534"],
  ["#FEF3C7", "#92400E"],
  ["#E0F2FE", "#075985"],
  ["#FAE8FF", "#86198F"],
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const joinDot = (...parts: (string | null)[]) => parts.filter(Boolean).join(" · ");

/** Entrance used by the results grid (cards stream in one at a time). */
export const cardEntrance = {
  initial: { opacity: 0, y: 60, rotateX: -50, scale: 0.86, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" },
  transition: { type: "spring" as const, stiffness: 160, damping: 20, mass: 0.9 },
};

type Props = { person: PersonProfile; saved: boolean; onSave: () => void };

export function PersonCard({ person, saved, onSave }: Props) {
  const [bg, fg] = colorFor(person.full_name);
  const roleLine = joinDot(person.title, person.company);
  const placeLine = joinDot(person.university, person.location);
  const tags = person.research_areas.slice(0, 2);

  const links = [
    person.linkedin_url && { href: person.linkedin_url, label: "LinkedIn", Icon: LinkedInIcon },
    person.github_url && { href: person.github_url, label: "GitHub", Icon: GitHubIcon },
    person.personal_site && { href: person.personal_site, label: "personal site", Icon: GlobeIcon },
  ].filter((l): l is { href: string; label: string; Icon: typeof GlobeIcon } => Boolean(l));

  return (
    <motion.article
      {...cardEntrance}
      whileHover={{ y: -4, boxShadow: "0 18px 40px -18px rgba(9,9,11,0.22)" }}
      className={cn(
        "flex h-full flex-col items-center rounded-[20px] border bg-surface px-4 pt-6 pb-3 text-center transition-colors duration-300",
        "shadow-[0_1px_2px_rgba(9,9,11,0.04)]",
        saved ? "border-accent" : "border-line",
      )}
      style={{ transformPerspective: 1000 }}
    >
      <div
        className="grid size-16 place-items-center rounded-full text-xl font-semibold"
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden="true"
      >
        {initials(person.full_name)}
      </div>

      <h3 className="mt-3 text-[17px] leading-snug font-semibold">{person.full_name}</h3>
      {roleLine && <p className="mt-1 text-sm text-muted">{roleLine}</p>}
      {placeLine && <p className="mt-0.5 text-[13px] text-muted">{placeLine}</p>}

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Research areas">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-muted">
              {t}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex w-full items-center justify-between border-t border-line pt-3">
        <div className="-ml-2 flex items-center">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${person.full_name} on ${label} (opens in new tab)`}
              className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink"
            >
              <Icon size={18} />
            </a>
          ))}
          {person.email && person.email_status && <EmailStatus email={person.email} status={person.email_status} />}
        </div>

        <SaveButton name={person.full_name} saved={saved} onSave={onSave} />
      </div>
    </motion.article>
  );
}

function EmailStatus({ email, status }: { email: string; status: "confirmed" | "guessed" }) {
  const confirmed = status === "confirmed";
  const label = confirmed ? `Email confirmed: ${email}` : `Email guessed: ${email}`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "ml-1 grid size-8 place-items-center rounded-full border",
        confirmed
          ? "border-[#86EFAC] bg-[#F0FDF4] text-[#15803D]"
          : "border-dashed border-[#D97706] bg-[#FFFBEB] text-[#B45309]",
      )}
    >
      <MailIcon size={15} />
    </span>
  );
}

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { x: Math.cos(angle) * 34, y: Math.sin(angle) * 34, color: i % 2 ? "#818CF8" : "#4F46E5" };
});

function SaveButton({ name, saved, onSave }: { name: string; saved: boolean; onSave: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => !saved && onSave()}
      aria-label={saved ? `${name} added to contacts` : `Add ${name} to contacts`}
      aria-disabled={saved}
      whileTap={saved ? undefined : { scale: 0.9 }}
      animate={{
        backgroundColor: saved ? "#4F46E5" : "#FFFFFF",
        borderColor: saved ? "#4F46E5" : "#E4E4E7",
        color: saved ? "#FFFFFF" : "#09090B",
      }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full border",
        saved ? "cursor-default" : "hover:border-ink",
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={saved ? "check" : "plus"}
          className="grid"
          initial={{ scale: 0, rotate: saved ? -90 : 90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: saved ? 90 : -90 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
        >
          {saved ? <CheckIcon size={20} strokeWidth={2.5} /> : <PlusIcon size={20} />}
        </motion.span>
      </AnimatePresence>

      {saved && !reduce && (
        <>
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {SPARKS.map((s, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: s.x, y: s.y, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
            />
          ))}
        </>
      )}
    </motion.button>
  );
}
