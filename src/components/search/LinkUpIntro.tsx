"use client";
// The "linking up" intro, played when Discover opens (once per browser session):
//   1. the 20 people from the network background pop in, in the same places
//   2. one by one, sweeping around the screen, each draws a line into a hub in the middle
//      (a dot rides the tip of each line), under "Linking up"
//   3. once everyone is connected the hub pulses and a ring bursts out: "Linked up"
//   4. the intro fades out; its people sit exactly on top of the background's people,
//      so they stay put while the normal network lines and the Discover page appear
// Click, tap or press any key to skip. Skipped entirely for prefers-reduced-motion.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IllustratedAvatar } from "@/components/shared/IllustratedAvatar";
import { CANVAS, NODES } from "./network-data";

// Same layer sizing as NetworkBackground, so every person lands on the same spot.
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 760;
const CENTER = { x: CANVAS.width / 2, y: CANVAS.height / 2 };

// Timeline, in seconds.
const SPOKE_START = 0.6; // first line starts drawing
const SPOKE_STAGGER = 0.07; // between one person's line and the next
const SPOKE_DRAW = 1.2; // how long each line takes to reach the middle
const CONNECTED_AT = SPOKE_START + SPOKE_STAGGER * (NODES.length - 1) + SPOKE_DRAW + 0.1;
const LEAVE_AT = CONNECTED_AT + 0.8;
const FADE_OUT = 0.8;
const EASE = [0.45, 0, 0.2, 1] as const;

const LINE = "#D4D4D8";
const LINE_LINKED = "#71717A";
const RING = "0 0 0 3px rgba(255,255,255,1), 0 6px 16px rgba(9,9,11,0.08)";

/** People ordered by angle around the middle, so the lines connect in one sweep around the screen. */
const SWEEP = NODES.map((node, i) => ({ i, angle: Math.atan2(node.y - CENTER.y, node.x - CENTER.x) }))
  .sort((a, b) => a.angle - b.angle)
  .map(({ i }) => i);

type Phase = "linking" | "connected" | "leaving";

type Props = {
  /** The intro has started fading out: mount the page underneath now. */
  onReveal: () => void;
  /** The intro is fully gone: unmount it. */
  onDone: () => void;
};

export function LinkUpIntro({ onReveal, onDone }: Props) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("linking");
  // Latest callbacks, read by the timers without restarting them.
  const callbacks = useRef({ onReveal, onDone });
  useEffect(() => {
    callbacks.current = { onReveal, onDone };
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const left = useRef(false);

  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    timers.current.forEach(clearTimeout);
    setPhase("leaving");
    callbacks.current.onReveal();
    timers.current = [setTimeout(() => callbacks.current.onDone(), FADE_OUT * 1000)];
  }, []);

  useEffect(() => {
    if (reduce) {
      left.current = true;
      callbacks.current.onReveal();
      callbacks.current.onDone();
      return;
    }
    timers.current = [
      setTimeout(() => setPhase("connected"), CONNECTED_AT * 1000),
      setTimeout(leave, LEAVE_AT * 1000),
    ];
    window.addEventListener("keydown", leave);
    const pending = timers;
    return () => {
      pending.current.forEach(clearTimeout);
      window.removeEventListener("keydown", leave);
    };
  }, [reduce, leave]);

  // The layer is stretched to the viewport; lines need its pixel size.
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

  if (reduce) return null;

  const px = (p: { x: number; y: number }) =>
    size ? { x: (p.x / CANVAS.width) * size.w, y: (p.y / CANVAS.height) * size.h } : p;
  const center = px(CENTER);
  const linked = phase !== "linking";

  return (
    <motion.div
      className="fixed inset-0 z-50 cursor-pointer overflow-hidden bg-canvas select-none"
      // the same dotted paper as the page body, so the fade-out is seamless
      style={{
        backgroundImage: "radial-gradient(var(--color-line) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === "leaving" ? 0 : 1 }}
      transition={{ duration: FADE_OUT, ease: "easeInOut" }}
      onPointerDown={leave}
    >
      <div
        ref={layerRef}
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{ width: `max(100%, ${MIN_WIDTH}px)`, height: `max(100%, ${MIN_HEIGHT}px)` }}
      >
        {size && (
          <svg width={size.w} height={size.h} className="absolute inset-0 overflow-visible">
            {SWEEP.map((nodeIndex, k) => {
              const from = px(NODES[nodeIndex]);
              const delay = SPOKE_START + k * SPOKE_STAGGER;
              return (
                <g key={`${nodeIndex}-${size.w}x${size.h}`}>
                  <motion.line
                    x1={from.x}
                    y1={from.y}
                    x2={center.x}
                    y2={center.y}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, stroke: LINE }}
                    animate={{ pathLength: 1, stroke: linked ? LINE_LINKED : LINE }}
                    transition={{
                      pathLength: { delay, duration: SPOKE_DRAW, ease: EASE },
                      stroke: { duration: 0.4 },
                    }}
                  />
                  {/* a dot riding the tip of the line into the middle */}
                  <motion.circle
                    r={3.5}
                    fill="#18181B"
                    initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                    animate={{ cx: center.x, cy: center.y, opacity: [0, 1, 1, 0] }}
                    transition={{
                      delay,
                      duration: SPOKE_DRAW,
                      ease: EASE,
                      opacity: { delay, duration: SPOKE_DRAW, times: [0, 0.1, 0.85, 1] },
                    }}
                  />
                </g>
              );
            })}

            {/* everyone connected: one ring bursts out of the hub */}
            {linked && (
              <motion.circle
                cx={center.x}
                cy={center.y}
                fill="none"
                stroke="#18181B"
                strokeWidth={2}
                initial={{ r: 30, opacity: 0.45 }}
                animate={{ r: Math.max(size.w, size.h) * 0.6, opacity: 0 }}
                transition={{ duration: 1.3, ease: "easeOut" }}
              />
            )}
          </svg>
        )}

        {NODES.map((node, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `calc(${(node.x / CANVAS.width) * 100}% - ${node.size / 2}px)`,
              top: `calc(${(node.y / CANVAS.height) * 100}% - ${node.size / 2}px)`,
              width: node.size,
              height: node.size,
            }}
          >
            <motion.div
              className="rounded-full"
              style={{ boxShadow: RING }}
              initial={{ scale: 0 }}
              animate={linked ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={
                linked
                  ? { duration: 0.45, delay: SWEEP.indexOf(i) * 0.015 }
                  : { type: "spring", stiffness: 320, damping: 18, delay: 0.1 + i * 0.035 }
              }
            >
              <IllustratedAvatar {...node} />
            </motion.div>
          </div>
        ))}

        {/* the hub everyone links up to */}
        <div className="absolute" style={{ left: "50%", top: "50%" }}>
          {!linked && (
            <motion.span
              className="absolute -top-10 -left-10 size-20 rounded-full border-2 border-ink/25"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.7, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
            />
          )}
          <motion.div
            className="absolute -top-7 -left-7 grid size-14 place-items-center rounded-full bg-ink shadow-[0_0_0_6px_#FFFFFF,0_18px_40px_-12px_rgba(9,9,11,0.45)]"
            initial={{ scale: 0 }}
            animate={linked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={
              linked ? { duration: 0.55, ease: "easeOut" } : { type: "spring", stiffness: 260, damping: 16, delay: 0.7 }
            }
          >
            <motion.span
              className="size-3 rounded-full bg-white"
              animate={linked ? { scale: 1.6 } : { scale: [1, 0.7, 1] }}
              transition={linked ? { duration: 0.3 } : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </div>

      {/* label under the hub, centred on the viewport like the hub */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: size ? `calc(${center.y}px + 52px)` : "calc(50% + 52px)" }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={linked ? "linked" : "linking"}
            className="m-0 text-base font-semibold tracking-tight text-ink"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay: linked ? 0 : 1 }}
          >
            {linked ? "Linked up" : "Linking up…"}
          </motion.p>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={leave}
        className="absolute right-5 bottom-5 rounded-full px-4 py-2 text-sm font-medium text-subtle transition-colors hover:bg-soft hover:text-ink"
      >
        Skip
      </button>
    </motion.div>
  );
}
