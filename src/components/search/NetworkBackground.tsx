"use client";
// The decorative network behind the Discover page. It doubles as the search animation:
//   idle      - lines draw in, avatars pop in, dots travel along some lines, every 3rd avatar pulses
//   searching - lines turn indigo, dots speed up 3x, every avatar pulses, avatars light up as "found"
//   results   - the whole layer fades to 25%
// People never sit behind page content (the card, filter bar, results...): anyone who would is
// nudged just outside it, and their lines follow. A line that would still pass under content fades
// out. Content is measured where it ends up, ignoring entrance animations, so nothing flickers.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IllustratedAvatar } from "@/components/shared/IllustratedAvatar";
import { CANVAS, DOT_LINES, EDGE_LINES, FOUND, LINES, NODES, SEGMENTS, type NetworkNode } from "./network-data";

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
/** Room to keep between a line and page content, px. */
const LINE_CLEARANCE = 6;

/** The person at each end of each segment in SEGMENTS (null = an off-screen end of an edge line). */
const SEGMENT_ENDS: [number | null, number | null][] = [
  ...LINES.map(([a, b]): [number, number] => [a, b]),
  ...EDGE_LINES.map(([n]): [null, number] => [null, n]),
];

type Offset = { dx: number; dy: number };
const NO_OFFSET: Offset = { dx: 0, dy: 0 };

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

  const { offsets, hiddenNodes, hiddenLines } = useClearOfContent(layerRef);

  const px = (p: { x: number; y: number }) =>
    size ? { x: (p.x / CANVAS.width) * size.w, y: (p.y / CANVAS.height) * size.h } : p;
  /** A segment end, moved with its person if they were nudged. */
  const end = (p: { x: number; y: number }, node: number | null) => {
    const point = px(p);
    const o = node === null ? NO_OFFSET : offsets[node];
    return { x: point.x + o.dx, y: point.y + o.dy };
  };

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
              const a = end(p, SEGMENT_ENDS[i][0]);
              const b = end(q, SEGMENT_ENDS[i][1]);
              return (
                <g key={i} style={{ opacity: hiddenLines.has(i) ? 0 : 1, transition: "opacity 300ms ease-out" }}>
                  <motion.line
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
                </g>
              );
            })}

            {!reduce &&
              DOT_LINES.map((segmentIndex, i) => {
                if (hiddenLines.has(segmentIndex)) return null;
                const [p, q] = SEGMENTS[segmentIndex];
                const [np, nq] = SEGMENT_ENDS[segmentIndex];
                const a = end(p, np);
                const b = end(q, nq);
                const from = i % 2 ? b : a;
                const to = i % 2 ? a : b;
                const duration = (2.6 + (i % 3) * 0.5) / (searching ? 3 : 1);
                return (
                  <motion.circle
                    // restart at the new speed when the mode changes, or at new coords on resize
                    key={`${segmentIndex}-${searching}-${Math.round(a.x)},${Math.round(a.y)},${Math.round(b.x)},${Math.round(b.y)}`}
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
            offset={offsets[i]}
            covered={hiddenNodes.has(i)}
            pulsing={searching || i % 3 === 0}
            reduce={reduce}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Keeps people clear of page content: anyone whose circle (plus clearance) overlaps a block of
 * content is pushed out through the nearest edge; lines that would still pass under content are
 * hidden. If a person can't be pushed clear (squeezed between blocks), they're hidden instead.
 * Re-checked a few times a second (results stream in, panels open), and on scroll and resize.
 */
function useClearOfContent(layerRef: React.RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState(() => ({
    offsets: NODES.map(() => NO_OFFSET),
    hiddenNodes: new Set<number>(),
    hiddenLines: new Set<number>(),
  }));

  useEffect(() => {
    let last = "";
    let timer = 0;
    const check = () => {
      const layer = layerRef.current;
      if (!layer) return;
      const box = layer.getBoundingClientRect();
      const toScreen = (p: { x: number; y: number }) => ({
        x: box.left + (p.x / CANVAS.width) * box.width,
        y: box.top + (p.y / CANVAS.height) * box.height,
      });
      const blocks = Array.from(document.querySelectorAll<HTMLElement>(CONTENT), layoutRect).filter(
        (r) => r.right > r.left && r.bottom > r.top,
      );

      const offsets: Offset[] = [];
      const hiddenNodes = new Set<number>();
      const placed: { x: number; y: number }[] = [];
      NODES.forEach((node, i) => {
        const start = toScreen(node);
        const r = node.size / 2 + CLEARANCE;
        const at = { ...start };
        for (let pass = 0; pass < 4; pass++) {
          const hit = blocks.find((b) => at.x + r > b.left && at.x - r < b.right && at.y + r > b.top && at.y - r < b.bottom);
          if (!hit) break;
          // out through the nearest side
          const moves = [
            { dx: hit.left - r - at.x, dy: 0 },
            { dx: hit.right + r - at.x, dy: 0 },
            { dx: 0, dy: hit.top - r - at.y },
            { dx: 0, dy: hit.bottom + r - at.y },
          ];
          const m = moves.reduce((best, mv) => (Math.hypot(mv.dx, mv.dy) < Math.hypot(best.dx, best.dy) ? mv : best));
          at.x += m.dx;
          at.y += m.dy;
        }
        const stillHit = blocks.some((b) => at.x + r > b.left && at.x - r < b.right && at.y + r > b.top && at.y - r < b.bottom);
        if (stillHit) hiddenNodes.add(i);
        offsets.push({ dx: Math.round(at.x - start.x), dy: Math.round(at.y - start.y) });
        placed.push(at);
      });

      const hiddenLines = new Set<number>();
      SEGMENTS.forEach(([p, q], i) => {
        const [np, nq] = SEGMENT_ENDS[i];
        if ((np !== null && hiddenNodes.has(np)) || (nq !== null && hiddenNodes.has(nq))) return hiddenLines.add(i);
        const a = np === null ? toScreen(p) : placed[np];
        const b = nq === null ? toScreen(q) : placed[nq];
        if (blocks.some((rect) => lineHitsRect(a, b, rect, LINE_CLEARANCE))) hiddenLines.add(i);
      });

      const key = JSON.stringify([offsets, [...hiddenNodes], [...hiddenLines]]);
      if (key !== last) {
        last = key;
        setState({ offsets, hiddenNodes, hiddenLines });
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

  return state;
}

type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Where an element sits on screen ignoring CSS transforms, i.e. where it ends up once entrance
 * animations (slide in, scale up) finish, so people don't jump around while the card animates.
 */
function layoutRect(el: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let fixed = false;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft;
    y += e.offsetTop;
    if (getComputedStyle(e).position === "fixed") fixed = true;
  }
  if (!fixed) {
    x -= window.scrollX;
    y -= window.scrollY;
  }
  return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight };
}

/** Does the segment a-b pass through rect r (grown by pad px)? Liang-Barsky clipping. */
function lineHitsRect(a: { x: number; y: number }, b: { x: number; y: number }, r: Box, pad: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, a.x - (r.left - pad)],
    [dx, r.right + pad - a.x],
    [-dy, a.y - (r.top - pad)],
    [dy, r.bottom + pad - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

function Avatar({
  node,
  index,
  found,
  offset,
  covered,
  pulsing,
  reduce,
}: {
  node: NetworkNode;
  index: number;
  found: boolean;
  /** How far this person was nudged to stay clear of page content, px. */
  offset: Offset;
  /** Couldn't be nudged clear of page content: faded out instead. */
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
        // nudged clear of page content (or faded out if that wasn't possible)
        translate: `${offset.dx}px ${offset.dy}px`,
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
