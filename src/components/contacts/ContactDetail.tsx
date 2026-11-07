"use client";
// The detail panel for the selected contact. The parent re-keys it per person, so the whole
// panel re-animates on every selection change and its sections stagger in.
import { motion, useReducedMotion, type Variants } from "motion/react";
import { IllustratedAvatar } from "@/components/shared/IllustratedAvatar";
import { avatarLook } from "@/components/shared/avatar-look";
import { CheckIcon, GitHubIcon, GlobeIcon, LinkedInIcon, MailIcon } from "@/components/shared/icons";
import { formatShortDate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";
import { TalkingPoints } from "./TalkingPoints";

export type NotesStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  contact: Contact;
  notesStatus: NotesStatus;
  onNotesChange: (notes: string) => void;
  onMarkContacted: () => void;
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

export function ContactDetail({ contact, notesStatus, onNotesChange, onMarkContacted, onRemove }: Props) {
  const reduce = useReducedMotion();
  const first = contact.full_name.split(/\s+/)[0];
  const never = !contact.last_contacted;
  const contactedToday = contact.last_contacted === todayISO();
  const place = [contact.university, contact.location].filter(Boolean).join(" · ");
  const links = [
    contact.linkedin_url && { href: contact.linkedin_url, label: `${first} on LinkedIn`, Icon: LinkedInIcon },
    contact.github_url && { href: contact.github_url, label: `${first} on GitHub`, Icon: GitHubIcon },
    contact.personal_site && { href: contact.personal_site, label: `${first}'s website`, Icon: GlobeIcon },
  ].filter((l): l is { href: string; label: string; Icon: typeof GlobeIcon } => Boolean(l));

  return (
    <motion.article
      aria-label={`${contact.full_name}, details`}
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
          <h2 className="m-0 text-[30px] leading-[1.1] font-semibold tracking-[-0.03em]">{contact.full_name}</h2>
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
            {contact.email_status === "confirmed" && (
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 text-xs font-medium text-[#166534]">
                <CheckIcon size={12} strokeWidth={2.5} />
                Confirmed
              </span>
            )}
            {contact.email_status === "guessed" && (
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
      {contact.talking_points?.trim() && (
        <motion.section variants={section}>
          <TalkingPoints text={contact.talking_points} />
        </motion.section>
      )}

      {/* 4. Research + Found via */}
      {(contact.research_areas.length > 0 || contact.sources.length > 0) && (
        <motion.section variants={section} className="flex flex-wrap gap-8">
          {contact.research_areas.length > 0 && (
            <div className="flex flex-[1_1_200px] flex-col gap-2.5">
              <h3 className="m-0 text-xs font-semibold text-subtle">Research</h3>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {contact.research_areas.map((r) => (
                  <li key={r} className="rounded-full bg-soft px-3 py-1.5 text-[13px] text-[#27272A]">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {contact.sources.length > 0 && (
            <div className="flex flex-[1_1_200px] flex-col gap-2.5">
              <h3 className="m-0 text-xs font-semibold text-subtle">Found via</h3>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {contact.sources.map((s) => (
                  <li
                    key={s}
                    title={s}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-[#3F3F46]"
                  >
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-border" />
                    {sourceLabel(s)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.section>
      )}

      {/* 5. Notes + footer actions */}
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
          <span className="text-[13px] text-muted">
            {contact.last_contacted ? `Last contacted ${formatShortDate(contact.last_contacted)}` : "Not contacted yet"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="h-11 rounded-full px-4 text-sm font-medium text-subtle transition-colors hover:bg-soft hover:text-ink"
            >
              Remove<span className="sr-only"> {contact.full_name}</span>
            </button>
            {contactedToday ? (
              <motion.span
                role="status"
                className="flex h-11 items-center gap-2 rounded-full bg-accent px-[18px] text-sm font-medium text-white"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: [0.4, 1.15, 1] }}
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <CheckIcon size={15} strokeWidth={2.5} />
                Contacted today
              </motion.span>
            ) : (
              <button
                type="button"
                onClick={onMarkContacted}
                className="flex h-11 items-center gap-2 rounded-full bg-ink px-[18px] text-sm font-medium text-white transition-[transform,background-color] duration-200 hover:scale-[1.04] hover:bg-accent motion-reduce:hover:scale-100"
              >
                <CheckIcon size={15} strokeWidth={2.25} />
                Mark contacted
              </button>
            )}
          </div>
        </div>
      </motion.section>
    </motion.article>
  );
}

/** Sources are labels ("GitHub") or URLs; show URLs as their hostname. */
function sourceLabel(source: string) {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}
