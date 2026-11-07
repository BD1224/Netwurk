"use client";
// A heading whose words rise in one by one (blur -> sharp, slight rotateX).
// Words marked `accent` render in Instrument Serif italic indigo.
import { motion, type Variants } from "motion/react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export type TitleWord = { text: string; accent?: boolean };

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const word: Variants = {
  hidden: { opacity: 0, y: 30, rotateX: 35, filter: "blur(10px)" },
  shown: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 140, damping: 18 },
  },
};

export function AnimatedTitle({ words, className }: { words: TitleWord[]; className?: string }) {
  return (
    <motion.h1
      className={cn("font-semibold tracking-[-0.045em]", className)}
      style={{ perspective: 800 }}
      variants={container}
      initial="hidden"
      animate="shown"
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <motion.span
            variants={word}
            className={cn(
              "inline-block origin-bottom",
              w.accent && "pr-[0.08em] font-serif text-[1.08em] font-normal tracking-[-0.01em] text-accent italic",
            )}
          >
            {w.text}
          </motion.span>
        </Fragment>
      ))}
    </motion.h1>
  );
}
