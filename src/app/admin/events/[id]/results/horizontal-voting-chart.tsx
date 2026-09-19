"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResultRow, ResultsSnapshot } from "@/lib/results";
import { AnimatedNumber } from "@/components/ui/animated-number";

const MAX_VISIBLE = 10;
const NAME_COL = "minmax(140px,260px)";
const COUNT_COL = "96px";
const BAR_GRADIENT = "linear-gradient(90deg,#a78bfa,#8b5cf6 55%,#7c3aed)";
const INSIDE_LABEL_THRESHOLD = 20; // % of track width above which the count sits inside the bar

/**
 * Large presentation-style horizontal ranking bar chart for every non-final
 * stage (live voting tally or an opened, still-not-final result). Candidates
 * with 0 votes never appear; the rest are ranked highest-first, capped at
 * `MAX_VISIBLE` with an inline "Read more" expansion for the remainder.
 *
 * Rows are keyed by candidate id and animated with framer-motion `layout` so
 * a rank change slides smoothly instead of the chart flickering/re-rendering
 * from scratch, and only the row whose vote count actually changed re-renders
 * (`BarRow` is memoized on the fields it reads).
 */
export function HorizontalVotingChart({ data }: { data: ResultsSnapshot }) {
  const masked = data.phase !== "result";
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // `data.results` is already sorted desc by votes (server-side, stable sort
  // — ties keep ballot order). Drop zero-vote rows and, when masked,
  // re-derive sequential "Anonymous NN" labels so the visible ranking numbers
  // itself 01..N with no gaps.
  const ranked: ResultRow[] = useMemo(() => {
    const withVotes = data.results.filter((r) => r.votes > 0);
    if (!masked) return withVotes;
    return withVotes.map((r, i) => ({ ...r, name: `Anonymous ${String(i + 1).padStart(2, "0")}` }));
  }, [data.results, masked]);

  const visible = showAll ? ranked : ranked.slice(0, MAX_VISIBLE);
  const overflow = ranked.length - Math.min(ranked.length, MAX_VISIBLE);

  // Newly revealed rows land below the fold — scroll them into view instead
  // of leaving the admin staring at the same unchanged top 10. Collapsing
  // resets the scroll back to the top for the same reason.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const id = requestAnimationFrame(() => {
      box.scrollTo({ top: showAll ? box.scrollHeight : 0, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [showAll]);

  // The bar scale (and its axis ticks) is derived only from what's currently on
  // screen, per spec — it re-widens automatically as fewer/smaller-vote
  // candidates are shown (e.g. after collapsing "Read more").
  const ticks = useMemo(() => {
    const top = Math.max(1, ...visible.map((r) => r.votes));
    return buildTicks(top);
  }, [visible]);
  const chartMax = ticks[ticks.length - 1];

  if (ranked.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-10">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b8fa8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h4" />
          </svg>
        </div>
        <div className="text-2xl font-semibold text-white/70">Menunggu suara pertama…</div>
        <div className="text-sm text-white/40 font-mono">Peringkat muncul begitu suara pertama masuk.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 min-h-0 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
        {/* ambient purple/blue glow, purely decorative */}
        <div
          className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,.28), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full pointer-events-none blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,.22), transparent 70%)" }}
        />

        <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pt-6">
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((row, i) => (
                <BarRow key={row.id} row={row} rank={i + 1} chartMax={chartMax} ticks={ticks} masked={masked} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        <AxisTicks ticks={ticks} max={chartMax} />
      </div>

      {overflow > 0 && (
        <div className="mt-4 flex-none self-center">
          {showAll ? (
            <button
              onClick={() => setShowAll(false)}
              aria-label="Tampilkan lebih sedikit"
              title="Tampilkan lebih sedikit"
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white/70 cursor-pointer hover:text-white hover:border-white/30 hover:bg-white/[0.08] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setShowAll(true)}
              className="font-mono text-[12.5px] tracking-[.1em] uppercase text-white/60 border border-white/15 rounded-full px-5 py-2.5 cursor-pointer hover:text-white hover:border-white/30 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              Baca Selengkapnya · {overflow} kandidat lainnya
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Numeric scale + baseline below the bars — subtle, secondary to the bars themselves. */
function AxisTicks({ ticks, max }: { ticks: number[]; max: number }) {
  return (
    <div className="grid flex-none border-t border-white/10 px-6 py-2.5" style={{ gridTemplateColumns: `${NAME_COL} 1fr ${COUNT_COL}`, gap: "1.25rem" }}>
      <span />
      <div className="relative h-4">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 font-mono text-[10.5px] text-white/35 tabular-nums"
            style={{ left: `${(t / max) * 100}%` }}
          >
            {formatTick(t)}
          </span>
        ))}
      </div>
      <span />
    </div>
  );
}

function BarRowImpl({
  row,
  rank,
  chartMax,
  ticks,
  masked,
}: {
  row: ResultRow;
  rank: number;
  chartMax: number;
  ticks: number[];
  masked: boolean;
}) {
  const pct = chartMax > 0 ? Math.min(100, (row.votes / chartMax) * 100) : 0;
  const labelInside = pct >= INSIDE_LABEL_THRESHOLD;
  const isLeader = rank === 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ layout: { type: "spring", stiffness: 300, damping: 32 }, opacity: { duration: 0.25 } }}
      className="grid items-center"
      style={{ gridTemplateColumns: `${NAME_COL} 1fr ${COUNT_COL}`, gap: "1.25rem" }}
    >
      <span className="flex items-center gap-3 min-w-0">
        <RowAvatar photo={row.photo} label={row.name} />
        <span
          className={`min-w-0 truncate font-bold tracking-tight text-white ${masked ? "font-mono tracking-[.02em]" : ""}`}
          style={{ fontSize: "clamp(16px,1.4vw,28px)" }}
          title={row.name}
        >
          {row.name}
        </span>
      </span>

      <div className={`relative rounded-[8px] bg-white/[0.04] overflow-hidden ${isLeader ? "h-16" : "h-13"}`}>
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 bottom-0 border-l border-dashed border-white/[0.08]"
            style={{ left: `${(t / chartMax) * 100}%` }}
          />
        ))}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-[8px] flex items-center justify-end"
          style={{ background: BAR_GRADIENT, boxShadow: isLeader ? "0 0 22px -4px rgba(168,85,247,.7)" : undefined }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {labelInside && (
            <span className="px-4 whitespace-nowrap">
              <AnimatedNumber
                value={row.votes}
                className="font-mono font-extrabold tabular-nums text-white leading-none"
                style={{ fontSize: "clamp(16px,1.5vw,30px)" }}
              />
            </span>
          )}
        </motion.div>
      </div>

      <span className="flex items-center justify-end">
        {!labelInside && (
          <AnimatedNumber
            value={row.votes}
            className="font-mono font-extrabold tabular-nums text-white leading-none"
            style={{ fontSize: "clamp(16px,1.5vw,30px)" }}
          />
        )}
      </span>
    </motion.div>
  );
}

function sameTicks(a: number[], b: number[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// `data` (and so `ticks`) arrives as a brand-new object on every realtime
// snapshot even when a given row's own numbers didn't change — compare by
// value, not reference, so an unrelated candidate's vote doesn't re-render
// every row on the board.
const BarRow = memo(BarRowImpl, (prev, next) => {
  return (
    prev.row.id === next.row.id &&
    prev.row.votes === next.row.votes &&
    prev.row.name === next.row.name &&
    prev.row.photo === next.row.photo &&
    prev.rank === next.rank &&
    prev.chartMax === next.chartMax &&
    prev.masked === next.masked &&
    sameTicks(prev.ticks, next.ticks)
  );
});

function RowAvatar({ photo, label }: { photo: string | null; label: string }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover flex-none border-2 border-white/15" />
    );
  }
  return (
    <span className="w-9 h-9 md:w-10 md:h-10 rounded-full flex-none flex items-center justify-center text-[13px] font-bold text-white bg-white/10">
      {label.slice(0, 1)}
    </span>
  );
}

/** Formats an axis tick as "1K"/"2.5K" above 1000, plain otherwise. */
function formatTick(v: number): string {
  if (v >= 1000) {
    const k = v / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return v.toLocaleString("id-ID");
}

/**
 * Evenly spaced round-number ticks from 0 up to (at least) `max`. Votes are
 * always whole numbers, so the step is clamped to a minimum of 1 — this also
 * sidesteps a duplicate-tick edge case a plain "nice number" step can hit
 * when `max` is very small (e.g. exactly 1 vote in).
 */
function buildTicks(max: number, targetCount = 5): number[] {
  if (max <= 0) return [0, 1];
  const rawStep = max / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = Math.max(1, Math.round(niceNorm * mag));
  const ticks: number[] = [];
  for (let v = 0; ; v += step) {
    ticks.push(v);
    if (v >= max) break;
  }
  return ticks;
}
