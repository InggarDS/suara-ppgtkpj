"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResultRow, ResultsSnapshot } from "@/lib/results";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { VotingTable } from "@/components/ui/voting-table";

const MAX_VISIBLE = 7;

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
            <RankRow key={row.id} row={row} rank={i + 1} topVotes={topVotes} masked={masked} />
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

function RankRow({
  row,
  rank,
  topVotes,
  masked,
}: {
  row: ResultRow;
  rank: number;
  topVotes: number;
  masked: boolean;
}) {
  const isLeader = rank === 1;
  const pctOfLeader = Math.max(4, Math.round((row.votes / topVotes) * 100));

  return (
    <motion.div
      layout
      layoutId={row.id}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ layout: { type: "spring", stiffness: 320, damping: 32 }, opacity: { duration: 0.25 } }}
      className={`flex items-center gap-4 rounded-2xl px-4 py-3 border flex-none ${
        isLeader ? "border-brand-accent-2 bg-white/[.06]" : "border-stage-dark-3 bg-stage-dark-2/40"
      }`}
      style={isLeader ? { boxShadow: "0 0 34px -12px rgba(77,123,245,.55)" } : undefined}
    >
      <span
        className={`font-mono text-[20px] font-bold w-9 text-center flex-none tabular-nums ${
          isLeader ? "text-brand-accent-2" : "text-stage-dimmer"
        }`}
      >
        {rank}
      </span>

      <RowAvatar photo={row.photo} label={row.name} isLeader={isLeader} />

      <span className="flex-1 min-w-0">
        <span
          className={`block text-[19px] font-semibold tracking-tight truncate ${
            masked ? "font-mono tracking-[.02em]" : ""
          } ${isLeader ? "text-white" : "text-stage-dim"}`}
        >
          {row.name}
        </span>
        <span className="block h-1.5 rounded bg-stage-dark-2 overflow-hidden mt-2 max-w-[320px]">
          <motion.span
            className="block h-full rounded"
            style={{ background: isLeader ? "linear-gradient(90deg,#3d6df0,#1b4de4)" : "#4a5a99" }}
            initial={false}
            animate={{ width: `${pctOfLeader}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </span>
      </span>

      <AnimatedNumber
        value={row.votes}
        className={`font-mono text-[28px] font-bold tabular-nums flex-none ${isLeader ? "text-brand-accent-2" : "text-white"}`}
      />
    </motion.div>
  );
}

function RowAvatar({ photo, label, isLeader }: { photo: string | null; label: string; isLeader: boolean }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={`w-12 h-12 rounded-full object-cover flex-none border-2 ${isLeader ? "border-brand-accent-2" : "border-stage-dark-4"}`}
      />
    );
  }
  return (
    <span
      className={`w-12 h-12 rounded-full flex-none flex items-center justify-center text-[15px] font-semibold ${
        isLeader ? "bg-brand-accent-2/20 text-brand-accent-2" : "bg-stage-dark-3 text-stage-dim"
      }`}
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
        className="w-full max-w-[720px] max-h-[80vh] overflow-y-auto bg-stage-dark-2 border border-stage-dark-4 rounded-2xl p-6"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[11px] tracking-[.12em] uppercase text-stage-dimmer">
            Semua Kandidat · {rows.length}
          </div>
          <button onClick={onClose} className="font-mono text-[11px] uppercase tracking-[.08em] text-stage-dim hover:text-white cursor-pointer">
            Tutup ✕
          </button>
        </div>
        <VotingTable rows={rows} tone="dark" />
      </motion.div>
    </motion.div>
  );
}
