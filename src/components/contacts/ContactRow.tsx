"use client";
// One row in the contact list: avatar, name, "Title · Company", and a "New" pill or last-contacted date.
import { motion } from "motion/react";
import { forwardRef } from "react";
import { IllustratedAvatar } from "@/components/shared/IllustratedAvatar";
import { avatarLook } from "@/components/shared/avatar-look";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";

type Props = {
  contact: Contact;
  selected: boolean;
  index: number;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export const ContactRow = forwardRef<HTMLButtonElement, Props>(function ContactRow(
  { contact, selected, index, onSelect, onKeyDown },
  ref,
) {
  const role = [contact.title, contact.company ?? contact.university].filter(Boolean).join(" · ");

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -24, filter: "blur(6px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -24, filter: "blur(6px)", transition: { duration: 0.25 } }}
      transition={{
        duration: 0.6,
        ease: [0.2, 0.9, 0.1, 1],
        delay: index * 0.06,
        layout: { duration: 0.35, ease: [0.2, 0.9, 0.1, 1] },
      }}
    >
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        onKeyDown={onKeyDown}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-[18px] px-3.5 py-3 text-left",
          "transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(.2,.9,.1,1)]",
          "hover:translate-x-[3px] hover:bg-surface motion-reduce:hover:translate-x-0",
          selected && "bg-surface shadow-[0_0_0_1px_#E4E4E7,0_12px_30px_-16px_rgba(9,9,11,0.25)]",
        )}
      >
        <span
          aria-hidden="true"
          className="size-[46px] flex-none overflow-hidden rounded-full shadow-[0_0_0_2px_#FFFFFF,0_6px_14px_-6px_rgba(9,9,11,0.3)]"
        >
          <IllustratedAvatar size={46} {...avatarLook(contact.id)} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-ink">{contact.full_name}</span>
          {role && <span className="truncate text-[13px] text-muted">{role}</span>}
        </span>
        {contact.last_contacted ? (
          <span className="flex-none font-mono text-xs text-subtle">
            <span className="sr-only">Last contacted </span>
            {formatShortDate(contact.last_contacted)}
          </span>
        ) : (
          <span className="flex-none rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-[#4338CA]">
            New
          </span>
        )}
      </button>
    </motion.li>
  );
});
