"use client";
// The decorative network behind the Discover page. It doubles as the search animation:
//   idle      - lines draw in, avatars pop in, dots travel along some lines, every 3rd avatar pulses
//   searching - lines turn indigo, dots speed up 3x, every avatar pulses, avatars light up as "found"
//   results   - the whole layer fades to 25%
// People who would sit behind page content (the card, filter bar, results...) fade out.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IllustratedAvatar } from "@/components/shared/IllustratedAvatar";
import { CANVAS, DOT_LINES, FOUND, NODES, SEGMENTS, type NetworkNode } from "./network-data";

export type NetworkMode = "idle" | "searching" | "results";

const LINE_IDLE = "#D4D4D8";
const LINE_ACTIVE = "#A5B4FC";

const RING_IDLE = "0 0 0 3px rgba(255,255,255,1), 0 0 0 9px rgba(79,70,229,0), 0 6px 16px rgba(9,9,11,0.08)";
const RING_FOUND = "0 0 0 3px rgba(79,70,229,1), 0 0 0 9px rgba(79,70,229,0.18), 0 6px 16px rgba(9,9,11,0.08)";

// Below these sizes the network stops shrinking and is cropped instead, so phones aren't crowded.
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 760;

/** Page content people must never sit behind: every top-level block of the page's <main> and
 *  <header>, plus anything marked data-network-avoid. */
const CONTENT = "main > *, header > *, [data-network-avoid]";
/** Room to keep between a person (including their pulse ring) and page content, px. */
const CLEARANCE = 12;

type Props = { mode: NetworkMode; foundCount: number };

export function NetworkBackground({ mode, foundCount }: Props) {
  const reduce = useReducedMotion() ?? false;
  const searching = mode === "searching";
  const found = new Set(FOUND.slice(0, foundCount));

  // The layer fills the viewport; lines need its pixel size to map canvas coords onto it.
  const layerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const covered = useCoveredNodes(layerRef);

  const px = (p: { x: number; y: number }) =>
    size ? { x: (p.x / CANVAS.width) * size.w, y: (p.y / CANVAS.height) * size.h } : p;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      animate={{ opacity: mode === "results" ? 0.25 : 1 }}
      transition={{ duration: 0.6 }}
    >
      <div
        ref={layerRef}
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{ width: `max(100%, ${MIN_WIDTH}px)`, height: `max(100%, ${MIN_HEIGHT}px)` }}
      >
        {size && (
          <svg width={size.w} height={size.h} className="absolute inset-0 overflow-visible">
            {SEGMENTS.map(([p, q], i) => {
              const a = px(p);
              const b = px(q);
              return (
                <motion.line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, stroke: LINE_IDLE }}
                  animate={{ pathLength: 1, stroke: searching ? LINE_ACTIVE : LINE_IDLE }}
                  transition={{
                    pathLength: { delay: 0.2 + i * 0.06, duration: 0.9, ease: "easeInOut" },
                    stroke: { duration: 0.5 },
                  }}
                />
              );
            })}

            {!reduce &&
              DOT_LINES.map((segmentIndex, i) => {
                const [p, q] = SEGMENTS[segmentIndex];
                const from = px(i % 2 ? q : p);
                const to = px(i % 2 ? p : q);
                const duration = (2.6 + (i % 3) * 0.5) / (searching ? 3 : 1);
                return (
                  <motion.circle
                    // restart at the new speed when the mode changes, or at new coords on resize
                    key={`${segmentIndex}-${searching}-${size.w}x${size.h}`}
                    r={3}
                    fill="#4F46E5"
                    initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                    animate={{ cx: [from.x, to.x], cy: [from.y, to.y], opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: searching ? 0.2 : 1.2 + (i % 4) * 0.4,
                      delay: searching ? (i % 4) * 0.15 : 3 + i * 0.5,
                      opacity: { duration, times: [0, 0.15, 0.85, 1], repeat: Infinity },
                    }}
                  />
                );
              })}
          </svg>
        )}

        {NODES.map((node, i) => (
          <Avatar
            key={i}
            node={node}
            index={i}
            found={found.has(i)}
            covered={covered.has(i)}
            pulsing={searching || i % 3 === 0}
            reduce={reduce}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Which people would sit behind page content right now. Re-checked a few times a second (content
 * changes as results stream in and cards animate), and on scroll and resize.
 */
function useCoveredNodes(layerRef: React.RefObject<HTMLDivElement | null>): Set<number> {
  const [covered, setCovered] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    let last = "";
    let timer = 0;
    const check = () => {
      const layer = layerRef.current;
      if (!layer) return;
      const box = layer.getBoundingClientRect();
      const blocks = Array.from(document.querySelectorAll(CONTENT), (el) => el.getBoundingClientRect()).filter(
        (r) => r.width > 0 && r.height > 0,
      );
      const hits: number[] = [];
      NODES.forEach((node, i) => {
        const x = box.left + (node.x / CANVAS.width) * box.width;
        const y = box.top + (node.y / CANVAS.height) * box.height;
        const r = node.size / 2 + CLEARANCE;
        if (blocks.some((b) => x + r > b.left && x - r < b.right && y + r > b.top && y - r < b.bottom)) hits.push(i);
      });
      const key = hits.join(",");
      if (key !== last) {
        last = key;
        setCovered(new Set(hits));
      }
    };
    const loop = () => {
      check();
      timer = window.setTimeout(loop, 250);
    };
    loop();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [layerRef]);

  return covered;
}

function Avatar({
  node,
  index,
  found,
  covered,
  pulsing,
  reduce,
}: {
  node: NetworkNode;
  index: number;
  found: boolean;
  /** Would sit behind page content: faded out instead. */
  covered: boolean;
  pulsing: boolean;
  reduce: boolean;
}) {
  // The staggered entrance delay applies only to the first pop-in.
  const [entered, setEntered] = useState(false);

  return (
    <div
      className="absolute transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none"
      style={{
        // percentages so avatars track the stretched canvas, even before the layer is measured
        left: `calc(${(node.x / CANVAS.width) * 100}% - ${node.size / 2}px)`,
        top: `calc(${(node.y / CANVAS.height) * 100}% - ${node.size / 2}px)`,
        width: node.size,
        height: node.size,
        // fade out rather than sit behind page content
        opacity: covered ? 0 : 1,
        scale: covered ? 0.6 : 1,
      }}
    >
      {pulsing &&
        (reduce ? (
          <span className="absolute -inset-2 rounded-full border-2 border-accent-border/50" />
        ) : (
          <motion.span
            className="absolute -inset-2 rounded-full border-2 border-accent-border"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: (index % 5) * 0.35 }}
          />
        ))}
      <motion.div
        className="relative rounded-full"
        initial={reduce ? false : { scale: 0, boxShadow: RING_IDLE }}
        animate={{ scale: found ? 1.18 : 1, boxShadow: found ? RING_FOUND : RING_IDLE }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: found ? 14 : 18,
          delay: entered ? 0 : 0.15 + index * 0.06,
          boxShadow: { duration: 0.35 },
        }}
        onAnimationComplete={() => setEntered(true)}
      >
        <IllustratedAvatar {...node} />
      </motion.div>
    </div>
  );
}
