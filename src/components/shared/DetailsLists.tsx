"use client";
// Details about a person, shared by the search details overlay and the contact book panel:
//   ExtrasGrid  - "New on GitHub" (repos) | "Research" (papers)
//   SourceList  - "Sources" pills linking to where the agent found the info
// Rows slide in one by one; shimmer rows stand in while something loads.
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Loadable, Paper, Repo } from "@/types";
import { ArrowUpRightIcon, GitHubIcon, PaperIcon, StarIcon } from "./icons";
import { timeAgo } from "@/lib/dates";

export type SourceLink = { label: string; url: string };

/** The two-column block: GitHub repos on the left, papers on the right. */
export function ExtrasGrid({
  repos,
  papers,
  className,
}: {
  repos: Loadable<Repo>;
  papers: Loadable<Paper>;
  className?: string;
}) {
  const busy = repos === "loading" || papers === "loading";
  return (
    <div
      aria-busy={busy}
      className={cn("grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-7", className)}
    >
      <Block icon={<GitHubIcon size={15} />} title="New on GitHub">
        {show(repos, 3, true, (r) => <RepoList repos={r} />)}
      </Block>
      <Block icon={<PaperIcon size={15} />} title="Research">
        {show(papers, 2, false, (p) => <PaperList papers={p} />)}
      </Block>
    </div>
  );
}

function show<T>(value: Loadable<T>, skeletons: number, tall: boolean, render: (items: T[]) => React.ReactNode) {
  if (value === "loading") return <SkeletonRows count={skeletons} tall={tall} />;
  if (value === "error") return <Empty>Couldn&apos;t load this. Try reopening.</Empty>;
  return render(value);
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="m-0 flex items-center gap-2 text-[13px] font-semibold text-subtle">
        <span aria-hidden="true">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** "Sources" pills. Pass `loading` to show a placeholder pill while they load. */
export function SourceList({ sources, loading = false }: { sources: SourceLink[]; loading?: boolean }) {
  return (
    <section className="flex flex-[1_1_240px] flex-col gap-2.5">
      <h3 className="m-0 text-[13px] font-semibold text-subtle">Sources</h3>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-[#3F3F46] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-soft motion-reduce:hover:translate-y-0"
            >
              {source.label}
              <ArrowUpRightIcon size={12} />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </li>
        ))}
        {loading && sources.length === 0 && <li aria-hidden="true" className="shimmer h-9 w-28 rounded-full" />}
      </ul>
    </section>
  );
}

/** "Research areas" pills. */
export function ResearchAreas({ areas }: { areas: string[] }) {
  return (
    <section className="flex flex-[1_1_240px] flex-col gap-2.5">
      <h3 className="m-0 text-[13px] font-semibold text-subtle">Research areas</h3>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {areas.map((area) => (
          <li key={area} className="rounded-full bg-soft px-3 py-1.5 text-[13px] text-[#27272A]">
            {area}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sources are stored as plain strings; only URLs can become links. */
export function toSourceLinks(sources: string[]): SourceLink[] {
  return sources.flatMap((source) => {
    try {
      const url = new URL(source);
      return [{ label: url.hostname.replace(/^www\./, ""), url: url.href }];
    } catch {
      return [];
    }
  });
}

const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Go: "#00ADD8",
  Rust: "#DEA584",
  "C++": "#F34B7D",
  C: "#555555",
  Java: "#B07219",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Lua: "#000080",
  "Jupyter Notebook": "#DA5B0B",
  Markdown: "#083FA1",
};

const rowIn = (i: number) => ({
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: [0.2, 0.9, 0.1, 1] as const, delay: 0.1 + i * 0.08 },
});

const rowClass =
  "flex rounded-[14px] border border-soft px-3.5 py-3 text-ink transition-[background-color,transform] duration-200 hover:translate-x-[3px] hover:bg-soft motion-reduce:hover:translate-x-0";

export function RepoList({ repos }: { repos: Repo[] }) {
  if (repos.length === 0) return <Empty>No public repos found.</Empty>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {repos.map((repo, i) => (
        <motion.li key={repo.url} {...rowIn(i)}>
          <a href={repo.url} target="_blank" rel="noopener noreferrer" className={`${rowClass} flex-col gap-1`}>
            <span className="flex items-baseline justify-between gap-2.5">
              <span className="truncate font-mono text-sm font-medium">{repo.name}</span>
              <span className="text-xs whitespace-nowrap text-subtle">Updated {timeAgo(repo.pushedAt)}</span>
            </span>
            {repo.description && <span className="text-[13px] leading-snug text-muted">{repo.description}</span>}
            <span className="flex gap-3.5 pt-0.5 text-xs text-muted">
              {repo.language && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: LANGUAGE_COLORS[repo.language] ?? "#A1A1AA" }}
                  />
                  {repo.language}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <StarIcon size={12} />
                {repo.stars.toLocaleString("en-US")}
                <span className="sr-only"> stars</span>
              </span>
            </span>
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </motion.li>
      ))}
    </ul>
  );
}

export function PaperList({ papers }: { papers: Paper[] }) {
  if (papers.length === 0) return <Empty>No papers found.</Empty>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {papers.map((paper, i) => {
        const meta = [paper.venue, paper.year].filter(Boolean).join(" · ");
        const body = (
          <>
            <span className="flex flex-col gap-[3px]">
              <span className="text-sm leading-snug font-medium">{paper.title}</span>
              {meta && <span className="text-xs text-subtle">{meta}</span>}
            </span>
            {paper.url && <ArrowUpRightIcon size={15} className="mt-0.5 flex-none text-subtle" />}
          </>
        );
        return (
          <motion.li key={paper.title} {...rowIn(i)}>
            {paper.url ? (
              <a href={paper.url} target="_blank" rel="noopener noreferrer" className={`${rowClass} justify-between gap-3`}>
                {body}
                <span className="sr-only">(opens in new tab)</span>
              </a>
            ) : (
              <div className="flex justify-between gap-3 rounded-[14px] border border-soft px-3.5 py-3">{body}</div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

/** Shimmer placeholders shaped like the rows above. */
export function SkeletonRows({ count, tall = false }: { count: number; tall?: boolean }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[14px] border border-soft px-3.5 py-3">
          <div className="shimmer h-3.5 w-2/5 rounded-full" />
          <div className="shimmer h-3 w-4/5 rounded-full" />
          {tall && <div className="shimmer h-3 w-1/4 rounded-full" />}
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-sm text-subtle">{children}</p>;
}
