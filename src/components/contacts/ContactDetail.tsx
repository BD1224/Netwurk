"use client";
// The detail panel for the selected contact. The parent re-keys it per person, so the whole
// panel re-animates on every selection change and its sections stagger in.
// Shows the same details as the search overlay (repos, papers, sources), plus the contact
// book's own tools: copyable talking points, status, notes, Remove.
// The parent passes repos (GitHub) and papers (/api/papers) as "loading" until they arrive.
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ExtrasGrid, ResearchAreas, SourceList, toSourceLinks } from "@/components/shared/DetailsLists";
import { IllustratedAvatar } from "@/components/shared/IllustratedAvatar";
import { avatarLook } from "@/components/shared/avatar-look";
import { CheckIcon, GitHubIcon, GlobeIcon, LinkedInIcon, MailIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import type { Contact, ContactStatus, Loadable, Paper, Repo } from "@/types";
import { STATUSES, STATUS_LABELS } from "./status";
import { TalkingPoints } from "./TalkingPoints";

export type NotesStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  contact: Contact;
  repos: Loadable<Repo>;
  papers: Loadable<Paper>;
  notesStatus: NotesStatus;
  onNotesChange: (notes: string) => void;
  onStatusChange: (status: ContactStatus) => void;
  onRemove: () => void;
};

const panel: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98, filter: "blur(8px)" },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.2, 0.9, 0.1, 1], staggerChildren: 0.06, delayChildren: 0.06 },
  },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.15 } },
};

const section: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.9, 0.1, 1] } },
};

const NOTES_STATUS_TEXT: Record<NotesStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save",
};

export function ContactDetail({
  contact,
  repos,
  papers,
  notesStatus,
  onNotesChange,
  onStatusChange,
  onRemove,
}: Props) {
  const reduce = useReducedMotion();
  const first = contact.fullName.split(/\s+/)[0];
  const never = contact.status === "to_contact";
  const place = [contact.university, contact.location].filter(Boolean).join(" · ");
  const links = [
    contact.linkedinUrl && { href: contact.linkedinUrl, label: `${first} on LinkedIn`, Icon: LinkedInIcon },
    contact.githubUrl && { href: contact.githubUrl, label: `${first} on GitHub`, Icon: GitHubIcon },
    contact.personalSite && { href: contact.personalSite, label: `${first}'s website`, Icon: GlobeIcon },
  ].filter((l): l is { href: string; label: string; Icon: typeof GlobeIcon } => Boolean(l));
  const sources = toSourceLinks(contact.sources);

  return (
    <motion.article
      aria-label={`${contact.fullName}, details`}
      variants={panel}
      initial="hidden"
      animate="shown"
      exit="exit"
      className="flex flex-col gap-7 rounded-[28px] border border-line bg-surface p-6 shadow-[0_30px_70px_-40px_rgba(9,9,11,0.25)] sm:p-8"
    >
      {/* 1. Header */}
      <section className="flex flex-wrap items-center gap-6">
        <motion.span
          aria-hidden="true"
          className="relative size-24 flex-none"
          initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          {never &&
            (reduce ? (
              <span className="absolute -inset-1.5 rounded-full border-2 border-accent-light/60" />
            ) : (
              <motion.span
                className="absolute -inset-1.5 rounded-full border-2 border-accent-light"
                animate={{ opacity: [0.7, 0], scale: [0.9, 1.45] }}
                transition={{ duration: 2.6, ease: "easeOut", repeat: Infinity }}
              />
            ))}
          <span className="absolute inset-0 overflow-hidden rounded-full shadow-[0_0_0_4px_#FFFFFF,0_14px_30px_-10px_rgba(9,9,11,0.35)]">
            <IllustratedAvatar size={96} {...avatarLook(contact.id)} />
          </span>
        </motion.span>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
          <h2 className="m-0 text-[30px] leading-[1.1] font-semibold tracking-[-0.03em]">{contact.fullName}</h2>
          {(contact.title || contact.company) && (
            <p className="m-0 text-[15px] text-[#3F3F46]">
              {contact.title}
              {contact.title && contact.company && <span className="text-subtle"> at </span>}
              {contact.company && <span className="font-medium text-ink">{contact.company}</span>}
            </p>
          )}
          {place && <p className="m-0 text-[13px] text-subtle">{place}</p>}
        </div>
      </section>

      {/* 2. Actions */}
      <motion.section variants={section} className="flex flex-wrap items-center gap-2">
        {contact.email ? (
          <>
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex h-11 max-w-full items-center gap-2 rounded-full bg-ink px-[18px] text-sm font-medium text-white transition-[transform,background-color] duration-200 hover:scale-[1.04] hover:bg-accent motion-reduce:hover:scale-100"
            >
              <MailIcon size={16} />
              <span className="truncate">{contact.email}</span>
            </a>
            {contact.emailStatus === "confirmed" && (
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 text-xs font-medium text-[#166534]">
                <CheckIcon size={12} strokeWidth={2.5} />
                Confirmed
              </span>
            )}
            {contact.emailStatus === "guessed" && (
              <span className="inline-flex h-7 items-center rounded-full bg-[#FEF3C7] px-2.5 text-xs font-medium text-[#92400E]">
                Guessed
              </span>
            )}
          </>
        ) : (
          <span className="inline-flex h-11 items-center rounded-full border border-dashed border-[#D4D4D8] px-[18px] text-sm text-subtle">
            No email found
          </span>
        )}
        <span className="flex-1" />
        {links.map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (opens in new tab)`}
            className="grid size-11 place-items-center rounded-full border border-line text-[#3F3F46] transition-[background-color,transform] duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-0.5 hover:bg-soft motion-reduce:hover:translate-y-0"
          >
            <Icon size={17} />
          </a>
        ))}
      </motion.section>

      {/* 3. Talking points */}
      {contact.talkingPoints?.trim() && (
        <motion.section variants={section}>
          <TalkingPoints text={contact.talkingPoints} />
        </motion.section>
      )}

      {/* 4. GitHub | Research (same as the search overlay) */}
      <motion.div variants={section}>
        <ExtrasGrid repos={repos} papers={papers} />
      </motion.div>

      {/* 5. Research areas + Sources */}
      {(contact.researchAreas.length > 0 || sources.length > 0) && (
        <motion.div variants={section} className="flex flex-wrap gap-7">
          {contact.researchAreas.length > 0 && <ResearchAreas areas={contact.researchAreas} />}
          {sources.length > 0 && <SourceList sources={sources} />}
        </motion.div>
      )}

      {/* 6. Notes + footer actions */}
      <motion.section variants={section} className="flex flex-col gap-2.5 border-t border-soft pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`notes-${contact.id}`} className="text-xs font-semibold text-subtle">
            Your notes
          </label>
          <span
            aria-live="polite"
            className={cn("text-xs", notesStatus === "error" ? "text-[#B91C1C]" : "text-subtle")}
          >
            {NOTES_STATUS_TEXT[notesStatus]}
          </span>
        </div>
        <textarea
          id={`notes-${contact.id}`}
          rows={3}
          value={contact.notes ?? ""}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="What did you talk about?"
          maxLength={5000}
          className="resize-y rounded-2xl border border-line bg-canvas px-3.5 py-3 text-[15px] leading-normal text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-subtle focus:border-accent-border focus:shadow-[0_0_0_4px_rgba(79,70,229,0.10)] focus:outline-none focus-visible:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5">
          <StatusPicker value={contact.status} onChange={onStatusChange} />
          <button
            type="button"
            onClick={onRemove}
            className="h-11 rounded-full px-4 text-sm font-medium text-subtle transition-colors hover:bg-soft hover:text-ink"
          >
            Remove<span className="sr-only"> {contact.fullName}</span>
          </button>
        </div>
      </motion.section>
    </motion.article>
  );
}

/** To reach out · Reached out · Replied · Met. The active one is black. */
function StatusPicker({ value, onChange }: { value: ContactStatus; onChange: (status: ContactStatus) => void }) {
  return (
    <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
      {STATUSES.map((status) => {
        const on = status === value;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(status)}
            className={cn(
              "relative flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
              on ? "text-white" : "text-muted hover:bg-soft hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId="status-pill"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {on && <CheckIcon size={13} strokeWidth={2.5} />}
              {STATUS_LABELS[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
