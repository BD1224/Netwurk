"use client";
// One search result: photo (or initials) avatar, name, role lines, up to 2 research tags,
// link icons, an email-status envelope, and a "+" button that saves to contacts.
// The avatar + name + role lines form one button that opens the details overlay; the links
// and "+" sit outside that button, so they never open it.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { SearchPerson } from "@/types";
import {
  CheckIcon,
  GitHubIcon,
  GlobeIcon,
  LinkedInIcon,
  MailIcon,
  PlusIcon,
} from "@/components/shared/icons";
import { PersonPhoto } from "@/components/shared/PersonPhoto";
import { colorFor, initials, joinDot } from "./person-style";

/** Entrance used by the results grid (cards stream in one at a time). */
export const cardEntrance = {
  initial: { opacity: 0, y: 60, rotateX: -50, scale: 0.86, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" },
  transition: { type: "spring" as const, stiffness: 160, damping: 20, mass: 0.9 },
};

type Props = { person: SearchPerson; saved: boolean; onSave: () => void; onOpen: () => void };

export function PersonCard({ person, saved, onSave, onOpen }: Props) {
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
        "flex w-full flex-col items-center rounded-[20px] border bg-surface px-4 pt-6 pb-3 text-center transition-colors duration-300",
        "shadow-[0_1px_2px_rgba(9,9,11,0.04)]",
        saved ? "border-accent" : "border-line",
      )}
      style={{ transformPerspective: 1000 }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View details for ${person.full_name}`}
        data-person-open={person.id}
        className="group flex w-full flex-col items-center rounded-2xl focus-visible:outline-offset-4"
      >
        <span
          className="grid size-16 place-items-center overflow-hidden rounded-full text-xl font-semibold"
          style={{ backgroundColor: bg, color: fg }}
          aria-hidden="true"
        >
          <PersonPhoto url={person.photo_url} fallback={initials(person.full_name)} />
        </span>
        <span className="mt-3 text-[17px] leading-snug font-semibold underline-offset-4 group-hover:underline">
          {person.full_name}
        </span>
        {roleLine && <span className="mt-1 text-sm text-muted">{roleLine}</span>}
        {placeLine && <span className="mt-0.5 text-[13px] text-muted">{placeLine}</span>}
      </button>

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Research areas">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-muted">
              {t}
            </li>
          ))}
        </ul>
      )}

      {/* Fixed gap, then the footer is pushed to the bottom so icon rows line up across a grid row. */}
      <span aria-hidden="true" className="h-4 flex-none" />
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
          {person.email && person.email_status && <EmailStatus status={person.email_status} />}
        </div>

        <SaveButton name={person.full_name} saved={saved} onSave={onSave} />
      </div>
    </motion.article>
  );
}

/** Whether an email was found, and how sure we are. The address itself only shows in Contacts. */
function EmailStatus({ status }: { status: "confirmed" | "guessed" }) {
  const confirmed = status === "confirmed";
  const label = confirmed ? "Email confirmed" : "Email guessed";
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
