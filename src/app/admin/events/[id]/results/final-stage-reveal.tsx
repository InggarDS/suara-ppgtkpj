"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResultRow, ResultsSnapshot } from "@/lib/results";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { VotingTable } from "@/components/ui/voting-table";

type Phase = "bars" | "transition" | "suspense" | "revealed";
const TRANSITION_MS = 700;
const SUSPENSE_MS = 3000;

/**
 * The final stage gets its own presentation: a live vertical-bar tally while
 * voting/before the result is opened, then — the moment `resultsOpen` flips
 * true — a one-shot cinematic sequence (3D transition → suspense → spotlight
 * reveal) before settling on the winner. Re-arms itself if the admin hides
 * and re-opens the result, so it always replays fully instead of skipping
 * straight to the end.
 *
 * All of this is local UI state layered on top of the same `data` prop the
 * rest of the projector board already receives over SSE — it doesn't gate,
 * delay or duplicate the realtime data flow.
 */
export function FinalStageReveal({ data }: { data: ResultsSnapshot }) {
  const isRevealedPhase = data.phase === "result";
  const [phase, setPhase] = useState<Phase>(isRevealedPhase ? "revealed" : "bars");
  const [trackedRevealed, setTrackedRevealed] = useState(isRevealedPhase);
  const [played, setPlayed] = useState(isRevealedPhase);

  // Render-phase reconciliation when the incoming reveal state changes — not
  // an effect, since this mirrors a prop synchronously (the sanctioned
  // pattern for "adjusting state when a prop changes"). State, not a ref,
  // tracks whether this reveal already played so it stays readable at render.
  if (isRevealedPhase !== trackedRevealed) {
    setTrackedRevealed(isRevealedPhase);
    if (!isRevealedPhase) {
      // Result hidden (or not open yet) — arm for a fresh full sequence next time.
      setPlayed(false);
      setPhase("bars");
    } else if (played) {
      // Already played this reveal (e.g. a reconnect/self-heal tick) — no replay.
      setPhase("revealed");
    } else {
      setPlayed(true);
      setPhase("transition");
    }
  }

  // The timed advance through the sequence is a genuine effect (external
  // timer), one per phase so each schedules only its own next step.
  useEffect(() => {
    if (phase !== "transition") return;
    const t = setTimeout(() => setPhase("suspense"), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "suspense") return;
    const t = setTimeout(() => setPhase("revealed"), SUSPENSE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const candidatePool = useMemo(() => data.results.filter((r) => r.id !== "abstain"), [data.results]);

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ perspective: 1200 }}>
      <AnimatePresence mode="wait">
        {phase === "bars" && (
          <motion.div
            key="bars"
            className="flex-1 flex flex-col min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StageLabel />
            <VerticalBars rows={candidatePool} totalVoters={data.totalVoters} />
          </motion.div>
        )}

        {phase === "transition" && (
          <motion.div
            key="transition"
            className="flex-1 flex flex-col min-h-0"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ opacity: 1, rotateX: 0 }}
            animate={{ opacity: 0, rotateX: -85 }}
            transition={{ duration: TRANSITION_MS / 1000, ease: "easeInOut" }}
          >
            <StageLabel />
            <VerticalBars rows={candidatePool} totalVoters={data.totalVoters} />
          </motion.div>
        )}

        {phase === "suspense" && (
          <motion.div
            key="suspense"
            className="flex-1 flex flex-col items-center justify-center gap-6"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, rotateX: 25 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span
              className="w-4 h-4 rounded-full bg-brand-accent-2"
              style={{ boxShadow: "0 0 40px 10px rgba(77,123,245,.5)" }}
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="font-mono text-[13px] tracking-[.3em] uppercase text-stage-dimmer">Mengumumkan Pemenang</div>
            <div className="text-[34px] font-semibold text-stage-dim tracking-tight">Mohon tunggu…</div>
          </motion.div>
        )}

        {phase === "revealed" && <RevealedWinner key="revealed" data={data} />}
      </AnimatePresence>
    </div>
  );
}

function StageLabel() {
  return (
    <div className="text-center mb-2 flex-none">
      <div className="font-mono text-[11px] tracking-[.25em] uppercase text-stage-dimmer">Stage Final · Live</div>
    </div>
  );
}

/**
 * Vertical bars, one column per final-stage candidate, height proportional to
 * the current leader. Still masked (identity hidden) like every other
 * pre-reveal view — only the live tally and ranking position show. Column
 * color intensity tiers with rank so the leading candidate(s) read as
 * visually "hotter" than the rest, without revealing who they are.
 */
function VerticalBars({ rows, totalVoters }: { rows: ResultRow[]; totalVoters: number }) {
  const ranked = useMemo(() => [...rows].sort((a, b) => b.votes - a.votes), [rows]);
  const top = Math.max(1, ranked[0]?.votes ?? 0);

  return (
    <div className="flex-1 flex items-end justify-center gap-5 pb-4 px-4 flex-wrap">
      {ranked.map((r, i) => {
        const isLeader = i === 0;
        const isRunnerUp = i > 0 && i < 3;
        const h = Math.max(4, Math.round((r.votes / top) * 100));
        const pctOfRegistered = totalVoters > 0 ? Math.round((r.votes / totalVoters) * 100) : 0;
        return (
          <div key={r.id} className="flex flex-col items-center gap-3 w-[110px] flex-none">
            <AnimatedNumber
              value={r.votes}
              className={`font-mono text-[22px] font-bold tabular-nums ${isLeader ? "text-brand-accent-2" : "text-white"}`}
            />
            <span className="font-mono text-[10px] text-stage-dimmer -mt-2">{pctOfRegistered}% peserta</span>
            <div
              className={`w-full h-[260px] flex items-end bg-stage-dark-2/40 rounded-t-xl overflow-hidden border border-b-0 ${
                isLeader ? "border-brand-accent-2" : "border-stage-dark-3"
              }`}
              style={isLeader ? { boxShadow: "0 0 30px -10px rgba(77,123,245,.6)" } : undefined}
            >
              <motion.div
                className="w-full rounded-t-xl"
                style={{
                  background: isLeader
                    ? "linear-gradient(180deg,#7ea1ff,#1b4de4)"
                    : isRunnerUp
                      ? "linear-gradient(180deg,#5a78d0,#2c4590)"
                      : "linear-gradient(180deg,#3c4a75,#232d54)",
                }}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span
              className={`font-mono text-[11px] tracking-[.06em] uppercase text-center truncate w-full ${
                isLeader ? "text-white" : "text-stage-dim"
              }`}
            >
              {r.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RevealedWinner({ data }: { data: ResultsSnapshot }) {
  const winnerIds = new Set(data.winners.map((w) => w.id));
  // Same rule as every non-final stage: only candidates who actually got a
  // vote appear in the full ranking below the winner.
  const rankedWithVotes = data.results.filter((r) => r.id !== "abstain" && r.votes > 0);
  const others = rankedWithVotes.filter((r) => !winnerIds.has(r.id));
  const tieCount = data.winners.length;

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center gap-8 py-6 overflow-y-auto relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* spotlight backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(420px 420px at 50% 38%, rgba(77,123,245,.35), transparent 65%)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      <motion.div
        className="font-mono text-[13px] tracking-[.3em] uppercase text-brand-accent-2 relative"
        style={{ textShadow: "0 0 24px rgba(77,123,245,.55)" }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {data.isTie ? "Hasil Seri" : "Pengumuman Pemenang"}
      </motion.div>

      {data.isTie ? <TieReveal winners={data.winners} /> : <SingleWinnerReveal data={data} />}

      {others.length > 0 && (
        <motion.div
          className="w-full max-w-[720px] pt-4 border-t border-stage-dark-3 relative"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: data.isTie ? 0.7 + tieCount * 0.15 + 0.6 : 1.3, duration: 0.5 }}
        >
          <div className="font-mono text-[10.5px] tracking-[.12em] uppercase text-stage-dimmer mb-3 text-center">
            Peringkat Lengkap
          </div>
          <VotingTable rows={rankedWithVotes} tone="dark" />
        </motion.div>
      )}
    </motion.div>
  );
}

const HEADLINE_STYLE: React.CSSProperties = {
  background: "linear-gradient(90deg,#4d7bf5,#8fb0ff)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

function SingleWinnerReveal({ data }: { data: ResultsSnapshot }) {
  return (
    <div className="flex flex-col items-center gap-4 relative">
      <motion.div
        className="relative rounded-full p-1.5"
        style={{ background: "linear-gradient(135deg,#3d6df0,#1230a8)", boxShadow: "0 0 70px -8px rgba(27,77,228,.7)" }}
        initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
      >
        {data.winnerPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.winnerPhoto} alt="" className="w-[190px] h-[190px] rounded-full object-cover border-4 border-stage-dark" />
        ) : (
          <span className="w-[190px] h-[190px] rounded-full border-4 border-stage-dark bg-stage-dark-3 flex items-center justify-center text-[52px] font-semibold text-stage-dim">
            {data.winnerName?.slice(0, 1)}
          </span>
        )}
      </motion.div>
      <motion.div
        className="text-[46px] font-semibold tracking-tight text-center leading-tight"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        {data.winnerName}
      </motion.div>
      {data.winnerNote && (
        <motion.div
          className="text-lg text-stage-dim font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.4 }}
        >
          {data.winnerNote}
        </motion.div>
      )}
      <motion.div
        className="text-[28px] font-bold tracking-[.08em] uppercase mt-1"
        style={HEADLINE_STYLE}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.15, duration: 0.5 }}
      >
        Selamat Terpilih
      </motion.div>
    </div>
  );
}

function TieReveal({ winners }: { winners: ResultRow[] }) {
  const headlineDelay = 0.7 + winners.length * 0.15 + 0.3;
  return (
    <div className="flex flex-col items-center gap-6 relative">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="text-[56px] font-semibold tracking-tight leading-none">{winners.length} Kandidat</div>
        <div className="text-lg text-stage-dim font-mono mt-2">unggul dengan {winners[0]?.votes ?? 0} suara yang sama</div>
      </motion.div>
      <div className="flex flex-wrap items-start justify-center gap-8 max-w-[860px]">
        {winners.map((w, i) => (
          <motion.div
            key={w.id}
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.7, rotateY: 90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.7 + i * 0.15, duration: 0.6, ease: "easeOut" }}
          >
            <div
              className="relative rounded-full p-1"
              style={{ background: "linear-gradient(135deg,#3d6df0,#1230a8)", boxShadow: "0 0 40px -12px rgba(27,77,228,.6)" }}
            >
              {w.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.photo} alt="" className="w-[130px] h-[130px] rounded-full object-cover border-4 border-stage-dark" />
              ) : (
                <span className="w-[130px] h-[130px] rounded-full border-4 border-stage-dark bg-stage-dark-3 flex items-center justify-center text-[34px] font-semibold text-stage-dim">
                  {w.name.slice(0, 1)}
                </span>
              )}
            </div>
            <div className="text-xl font-semibold tracking-tight text-center max-w-[180px]">{w.name}</div>
            {w.note && <div className="text-sm text-stage-dim font-mono text-center">{w.note}</div>}
          </motion.div>
        ))}
      </div>
      <motion.div
        className="text-[26px] font-bold tracking-[.08em] uppercase"
        style={HEADLINE_STYLE}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: headlineDelay, duration: 0.5 }}
      >
        Selamat Terpilih
      </motion.div>
    </div>
  );
}
