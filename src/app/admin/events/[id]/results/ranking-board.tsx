"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResultRow, ResultsSnapshot } from "@/lib/results";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { VotingTable } from "@/components/ui/voting-table";

const MAX_VISIBLE = 7;

const GRADIENT = "linear-gradient(90deg,#1b4de4,#0a1a4f)";
const GRADIENT_TEXT: React.CSSProperties = {
  background: GRADIENT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/**
 * Live ranking for every non-final stage. Candidates with 0 votes are hidden
 * entirely, the rest are ranked by vote count, capped at 7 on the main board
 * with a "See More" overlay for the full list. Rows are keyed by candidate id
 * and animated with `layout` (FLIP) so a rank change slides smoothly instead
 * of the list flickering/re-rendering from scratch.
 */
export function RankingBoard({ data }: { data: ResultsSnapshot }) {
  const masked = data.phase !== "result";
  const [showAll, setShowAll] = useState(false);

  // `data.results` is already sorted desc by votes (server-side, stable sort
  // — ties keep ballot order, so this never jitters on its own). Just drop
  // zero-vote rows and, when masked, re-derive sequential "Anonymous NN"
  // labels so the visible ranking numbers itself 01..N with no gaps.
  const ranked: ResultRow[] = useMemo(() => {
    const withVotes = data.results.filter((r) => r.votes > 0);
    if (!masked) return withVotes;
    return withVotes.map((r, i) => ({ ...r, name: `Anonymous ${String(i + 1).padStart(2, "0")}` }));
  }, [data.results, masked]);

  const topVotes = ranked[0]?.votes ?? 1;
  const visible = ranked.slice(0, MAX_VISIBLE);
  const overflow = ranked.length - visible.length;

  if (ranked.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-10">
        <div className="w-16 h-16 rounded-full bg-stage-dark-3 flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6C76A0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h4" />
          </svg>
        </div>
        <div className="text-2xl font-semibold text-stage-dim">Menunggu suara pertama…</div>
        <div className="text-sm text-stage-dimmer font-mono">Peringkat muncul begitu suara pertama masuk.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {visible.map((row, i) => (
            <RankRow key={row.id} row={row} rank={i + 1} topVotes={topVotes} masked={masked} totalVoters={data.totalVoters} />
          ))}
        </AnimatePresence>
      </div>

      {overflow > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 flex-none self-center font-mono text-[11.5px] tracking-[.08em] uppercase text-stage-dim border border-stage-dark-4 rounded-full px-4 py-2 cursor-pointer hover:text-white hover:border-stage-dim bg-stage-dark-3/60"
        >
          Lihat Selengkapnya · {overflow} kandidat lainnya
        </button>
      )}

      <AnimatePresence>
        {showAll && <SeeMoreOverlay rows={ranked} onClose={() => setShowAll(false)} />}
      </AnimatePresence>
    </div>
  );
}

/** Rank tier drives how strongly a row is highlighted — the leader is the
 *  most visually prominent, easing off toward the bottom of the board. */
function tierOf(rank: number): "leader" | "runner-up" | "plain" {
  if (rank === 1) return "leader";
  if (rank <= 3) return "runner-up";
  return "plain";
}

function RankRow({
  row,
  rank,
  topVotes,
  masked,
  totalVoters,
}: {
  row: ResultRow;
  rank: number;
  topVotes: number;
  masked: boolean;
  totalVoters: number;
}) {
  const tier = tierOf(rank);
  const pctOfLeader = Math.max(4, Math.round((row.votes / topVotes) * 100));
  const pctOfRegistered = totalVoters > 0 ? Math.round((row.votes / totalVoters) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ layout: { type: "spring", stiffness: 320, damping: 32 }, opacity: { duration: 0.25 } }}
      className={`flex items-center gap-4 rounded-2xl px-4 py-3 bg-white flex-none ${
        tier === "leader" ? "border-2 border-[#1b4de4]" : tier === "runner-up" ? "border border-[#b9c8f7]" : "border border-slate-200"
      }`}
      style={
        tier === "leader"
          ? { boxShadow: "0 8px 28px -8px rgba(27,77,228,.45)" }
          : tier === "runner-up"
            ? { boxShadow: "0 4px 16px -8px rgba(27,77,228,.2)" }
            : undefined
      }
    >
      {tier === "leader" ? (
        <span
          className="font-mono text-[15px] font-bold w-9 h-9 rounded-full text-center flex-none flex items-center justify-center text-white"
          style={{ background: GRADIENT }}
        >
          {rank}
        </span>
      ) : (
        <span className={`font-mono text-[20px] font-bold w-9 text-center flex-none tabular-nums ${tier === "runner-up" ? "text-[#1b4de4]" : "text-slate-400"}`}>
          {rank}
        </span>
      )}

      <RowAvatar photo={row.photo} label={row.name} tier={tier} />

      <span className="flex-1 min-w-0">
        <span
          className={`block text-[19px] font-bold tracking-tight truncate ${masked ? "font-mono tracking-[.02em]" : ""}`}
          style={GRADIENT_TEXT}
        >
          {row.name}
        </span>
        <span className="block h-1.5 rounded bg-slate-100 overflow-hidden mt-2 max-w-[320px]">
          <motion.span
            className="block h-full rounded"
            style={{ background: tier === "plain" ? "#8ea3e0" : GRADIENT }}
            initial={false}
            animate={{ width: `${pctOfLeader}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </span>
      </span>

      <span className="flex flex-col items-end flex-none">
        <AnimatedNumber value={row.votes} className="font-mono text-[28px] font-extrabold tabular-nums leading-none" style={GRADIENT_TEXT} />
        <span className="font-mono text-[10px] text-slate-400 mt-1">{pctOfRegistered}% peserta</span>
      </span>
    </motion.div>
  );
}

function RowAvatar({ photo, label, tier }: { photo: string | null; label: string; tier: "leader" | "runner-up" | "plain" }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className="w-12 h-12 rounded-full object-cover flex-none border-2"
        style={{ borderColor: tier === "leader" ? "#1b4de4" : tier === "runner-up" ? "#b9c8f7" : "#e2e8f0" }}
      />
    );
  }
  return (
    <span
      className={`w-12 h-12 rounded-full flex-none flex items-center justify-center text-[15px] font-bold ${
        tier === "plain" ? "bg-slate-100 text-slate-500" : "text-white"
      }`}
      style={tier !== "plain" ? { background: GRADIENT } : undefined}
    >
      {label.slice(0, 1)}
    </span>
  );
}

function SeeMoreOverlay({ rows, onClose }: { rows: ResultRow[]; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[720px] max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-6"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[11px] tracking-[.12em] uppercase text-slate-400">
            Semua Kandidat · {rows.length}
          </div>
          <button onClick={onClose} className="font-mono text-[11px] uppercase tracking-[.08em] text-slate-400 hover:text-ink cursor-pointer">
            Tutup ✕
          </button>
        </div>
        <VotingTable rows={rows} tone="light" />
      </motion.div>
    </motion.div>
  );
}
