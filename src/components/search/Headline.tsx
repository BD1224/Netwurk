"use client";
// "Who do you want to meet?"
import { AnimatedTitle, type TitleWord } from "@/components/shared/AnimatedTitle";

const WORDS: TitleWord[] = [
  { text: "Who" },
  { text: "do" },
  { text: "you" },
  { text: "want" },
  { text: "to" },
  { text: "meet?", accent: true },
];

export function Headline() {
  return (
    <AnimatedTitle
      words={WORDS}
      className="text-center text-[clamp(2.6rem,5.2vw,4.5rem)] leading-[1.02] text-balance"
    />
  );
}
