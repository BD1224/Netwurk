"use client";
// The details overlay for one search result (opened from a PersonCard).
// Radix Dialog (what shadcn's Dialog wraps) handles the focus trap, Escape, scroll lock and
// returning focus to the card; Motion handles enter/exit. It opens instantly with the card's
// data, and repos / papers / accolades fill in when GET /api/people/[id]/details answers.
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useRef, useState } from "react";
import { ExtrasGrid, ResearchAreas, SourceList, toSourceLinks } from "@/components/shared/DetailsLists";
import { CheckIcon, GitHubIcon, GlobeIcon, LinkedInIcon, MailIcon, PlusIcon, ScholarIcon, XIcon } from "@/components/shared/icons";
import { PersonPhoto } from "@/components/shared/PersonPhoto";
import type { DetailsState } from "@/hooks/usePersonDetails";
import { cn } from "@/lib/utils";
import type { SearchPerson, SourceLink } from "@/types";
import { colorFor, initials, joinDot } from "./person-style";

type Props = {
  /** The person to show, or null when closed. */
  person: SearchPerson | null;
  details: DetailsState | null;
  saved: boolean;
  onSave: (person: SearchPerson) => void;
  onClose: () => void;
};

const panel: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.94, filter: "blur(10px)" },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.2, 0.9, 0.1, 1], staggerChildren: 0.08, delayChildren: 0.12 },
  },
  exit: { opacity: 0, y: 24, scale: 0.97, filter: "blur(6px)", transition: { duration: 0.2 } },
};

const section: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.9, 0.1, 1] } },
};

export function PersonDialog({ person, details, saved, onSave, onClose }: Props) {
  return (
    <Dialog.Root open={person !== null} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {person && (
          <Dialog.Portal forceMount key={person.id}>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-40 overflow-y-auto bg-[rgba(9,9,11,0.35)] backdrop-blur-[8px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.05 } }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex min-h-full items-start justify-center px-4 py-12">
                  <Panel person={person} details={details} saved={saved} onSave={() => onSave(person)} />
                </div>
              </motion.div>
            </Dialog.Overlay>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Panel({
  person,
  details,
  saved,
  onSave,
}: {
  person: SearchPerson;
  details: DetailsState | null;
  saved: boolean;
  onSave: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [bg, fg] = colorFor(person.full_name);
  const first = person.full_name.split(/\s+/)[0];
  const ready = details?.status === "ready" ? details.data : null;
  const loading = !details || details.status === "loading";

  const talkingPoints = (ready?.talking_points ?? person.talking_points ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const sources: SourceLink[] = ready?.sources ?? toSourceLinks(person.sources);
  const failed = details?.status === "error";
  const list = <T,>(items: T[] | undefined) => (loading ? "loading" : failed ? "error" : (items ?? []));
  const place = joinDot(person.university, person.location);

  const links = [
    person.linkedin_url && { href: person.linkedin_url, label: "LinkedIn", Icon: LinkedInIcon },
    person.github_url && { href: person.github_url, label: "GitHub", Icon: GitHubIcon },
    person.scholar_url && { href: person.scholar_url, label: "Scholar", Icon: ScholarIcon },
    person.personal_site && { href: person.personal_site, label: "Website", Icon: GlobeIcon },
  ].filter((l): l is { href: string; label: string; Icon: typeof GlobeIcon } => Boolean(l));

  return (
    <Dialog.Content
      forceMount
      asChild
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        closeRef.current?.focus();
      }}
      // The dialog opens from the URL, not a Dialog.Trigger, so return focus to the card ourselves
      // (covers Escape, the X, the backdrop and the Back button).
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        document.querySelector<HTMLElement>(`[data-person-open="${CSS.escape(person.id)}"]`)?.focus();
      }}
    >
      <motion.article
        variants={panel}
        initial="hidden"
        animate="shown"
        exit="exit"
        className="relative w-full max-w-[840px] overflow-hidden rounded-[28px] bg-surface shadow-[0_40px_100px_-30px_rgba(9,9,11,0.55)]"
      >
        {/* Banner */}
        <div
          aria-hidden="true"
          className="h-32"
          style={{
            backgroundColor: bg,
            backgroundImage: "radial-gradient(rgba(9,9,11,0.10) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <Dialog.Close
          ref={closeRef}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-[0_4px_14px_rgba(9,9,11,0.12)] transition-[transform,background-color] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:rotate-90 hover:bg-soft motion-reduce:hover:rotate-0"
        >
          <XIcon size={16} strokeWidth={2.25} />
        </Dialog.Close>

        <div className="-mt-[52px] flex flex-col gap-7 px-5 pb-8 sm:px-8">
          {/* Header */}
          <div className="flex flex-wrap items-end gap-5">
            <motion.span
              aria-hidden="true"
              className="grid size-[104px] flex-none place-items-center overflow-hidden rounded-full text-[32px] font-semibold tracking-[-0.02em] shadow-[0_0_0_6px_#FFFFFF,0_16px_34px_-12px_rgba(9,9,11,0.35)]"
              style={{ backgroundColor: bg, color: fg }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 14, delay: 0.15 }}
            >
              <PersonPhoto url={person.photo_url} fallback={initials(person.full_name)} />
            </motion.span>
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1 pb-1">
              <Dialog.Title className="m-0 text-[30px] leading-[1.1] font-semibold tracking-[-0.03em]">
                {person.full_name}
              </Dialog.Title>
              <Dialog.Description className="m-0 text-[15px] text-[#3F3F46]">
                {person.title}
                {person.title && person.company && <span className="text-subtle"> at </span>}
                {person.company && <span className="font-medium text-ink">{person.company}</span>}
              </Dialog.Description>
              {place && <p className="m-0 text-[13px] text-subtle">{place}</p>}
            </div>
            <div className="pb-1">
              <AddButton name={person.full_name} first={first} saved={saved} onSave={onSave} />
            </div>
          </div>

          {/* Email + links */}
          <motion.div variants={section} className="flex flex-wrap items-center gap-2">
            <EmailChip email={person.email} status={person.email_status} />
            {links.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-ink transition-[background-color,transform] duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-0.5 hover:bg-soft motion-reduce:hover:translate-y-0"
              >
                <Icon size={15} />
                {label}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ))}
          </motion.div>

          {/* Why reach out */}
          {talkingPoints.length > 0 && (
            <motion.section variants={section} className="flex flex-col gap-3 rounded-[22px] bg-accent-soft px-6 py-[22px]">
              <h3 className="m-0 text-lg font-semibold text-ink">Why reach out</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {talkingPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[15px] leading-normal text-ink">
                    <span aria-hidden="true" className="mt-[9px] size-1.5 flex-none rounded-full bg-accent" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          {/* GitHub | Research + Accolades */}
          <motion.div variants={section}>
            <ExtrasGrid repos={list(ready?.repos)} papers={list(ready?.papers)} accolades={list(ready?.accolades)} />
          </motion.div>

          {/* Research areas + Sources */}
          {(person.research_areas.length > 0 || sources.length > 0 || loading) && (
            <motion.div variants={section} className="flex flex-wrap gap-7 border-t border-soft pt-6">
              {person.research_areas.length > 0 && <ResearchAreas areas={person.research_areas} />}
              {(sources.length > 0 || loading) && <SourceList sources={sources} loading={loading} />}
            </motion.div>
          )}
        </div>
      </motion.article>
    </Dialog.Content>
  );
}

/** Whether an email was found, and how sure we are. The address itself only shows in Contacts. */
function EmailChip({ email, status }: { email: string | null; status: SearchPerson["email_status"] }) {
  if (!email || !status) {
    return (
      <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-[#D4D4D8] px-3.5 text-[13px] text-subtle">
        No email found
      </span>
    );
  }
  const confirmed = status === "confirmed";
  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium",
        confirmed ? "bg-[#DCFCE7] text-[#166534]" : "border border-dashed border-[#D97706] bg-[#FEF3C7] text-[#92400E]",
      )}
    >
      <MailIcon size={15} />
      {confirmed ? "Email confirmed" : "Email guessed"}
    </span>
  );
}

/** "+ Add to contacts" -> "✓ Saved" with a ring burst. Shares saved state with the card's "+" button. */
function AddButton({ name, first, saved, onSave }: { name: string; first: string; saved: boolean; onSave: () => void }) {
  const reduce = useReducedMotion();
  // Only burst when the save happens here, not when opening someone already saved.
  const [savedOnOpen] = useState(saved);
  const justSaved = saved && !savedOnOpen;

  return (
    <span className="relative inline-flex">
      <motion.button
        type="button"
        onClick={() => !saved && onSave()}
        aria-disabled={saved}
        aria-label={saved ? `${name} added to contacts` : `Add ${name} to contacts`}
        whileTap={saved ? undefined : { scale: 0.95 }}
        animate={{ backgroundColor: saved ? "#4F46E5" : "#09090B" }}
        transition={{ duration: 0.25 }}
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-full pr-5 pl-4 text-[15px] font-medium text-white transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)]",
          saved ? "cursor-default" : "hover:scale-[1.04] motion-reduce:hover:scale-100",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={saved ? "check" : "plus"}
            className="grid"
            initial={{ scale: 0, rotate: saved ? -90 : 90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            {saved ? <CheckIcon size={17} strokeWidth={2.5} /> : <PlusIcon size={17} strokeWidth={2.25} />}
          </motion.span>
        </AnimatePresence>
        {saved ? "Saved" : "Add to contacts"}
      </motion.button>
      {justSaved && !reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
      {/* The page toast is hidden from screen readers while the dialog is open, so announce here. */}
      <span role="status" className="sr-only">
        {justSaved ? `${first} added to contacts` : ""}
      </span>
    </span>
  );
}
