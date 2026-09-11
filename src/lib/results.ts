import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/ids";
import { pct } from "@/lib/format";
import { cached, cacheKeys } from "@/lib/cache";

export type ResultRow = {
  id: string;
  name: string;
  jemaat: string | null;
  note: string | null;
  photo: string | null;
  initials: string | null;
  votes: number;
  pct: number;
};

/** Tier 1: cached in Redis with a short TTL, cleared on every `publish()`. */
export async function getResultsSnapshot(eventId: string) {
  return cached(cacheKeys.results(eventId), () => loadResultsSnapshot(eventId));
}

async function loadResultsSnapshot(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      stages: {
        orderBy: { order: "desc" },
        include: {
          candidates: {
            orderBy: { order: "asc" },
            include: { participant: { select: { jemaat: true, photo: true } } },
          },
          votes: true,
          _count: { select: { checkIns: true } },
        },
      },
    },
  });
  if (!event) return null;

  const registered = await prisma.participant.count({ where: { eventId, registeredAt: { not: null } } });
  const totalVoters = registered;

  const stageSequence = [...event.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ order: s.order, name: s.name, status: s.status }));
  const maxOrder = stageSequence.length ? Math.max(...stageSequence.map((s) => s.order)) : 0;

  // The whole process is finished once the last stage has been closed.
  const finalStage = event.stages.find((s) => s.order === maxOrder);
  const votingComplete = Boolean(finalStage && finalStage.status === "CLOSED");

  // stages arrive ordered by `order: "desc"`, so the first match is the latest.
  const resultStage = event.stages.find((s) => s.resultsOpen);
  const votingStage = event.stages.find((s) => s.status === "VOTING");
  const checkInStage = event.stages.find((s) => s.status === "CHECK_IN");
  const stoppedStage = event.stages.find((s) => s.status === "STOPPED" || s.status === "CLOSED");
  const targetStage = resultStage ?? votingStage ?? checkInStage ?? stoppedStage ?? event.stages[0] ?? null;

  const phase: "idle" | "checkin" | "voting" | "result" = !targetStage
    ? "idle"
    : targetStage.resultsOpen
      ? "result"
      : targetStage.status === "VOTING"
        ? "voting"
        : targetStage.status === "CHECK_IN"
          ? "checkin"
          : "idle";

  const notStarted = phase === "idle";

  if (!targetStage) {
    return {
      phase,
      votingComplete,
      revealed: false,
      resultsOpen: false,
      canOpenResult: false,
      stageName: null,
      stageOrder: 0,
      isFinalStage: false,
      stageSequence,
      notStarted: true,
      live: false,
      totalVoters,
      totalVotes: 0,
      votedCount: 0,
      checkedInCount: 0,
      checkInPct: 0,
      votingPct: 0,
      denom: totalVoters || 1,
      registered,
      registrationPct: 0,
      results: [] as ResultRow[],
      winnerId: null,
      winnerName: null,
      winnerNote: null,
      winnerPhoto: null,
      winners: [] as ResultRow[],
      isTie: false,
    };
  }

  const votesByCandidate = new Map<string, number>();
  let abstainCount = 0;
  for (const v of targetStage.votes) {
    if (v.isAbstain) abstainCount++;
    else if (v.candidateId) votesByCandidate.set(v.candidateId, (votesByCandidate.get(v.candidateId) ?? 0) + 1);
  }
  const totalVotes = targetStage.votes.length;
  const votedCount = totalVotes;
  const checkedInCount = targetStage._count.checkIns;
  const revealed = phase === "result";

  type RawRow = { id: string; name: string; jemaat: string | null; note: string | null; photo: string | null; votes: number };
  const raw: RawRow[] = targetStage.candidates
    .map((c): RawRow => {
      const votes = votesByCandidate.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        jemaat: c.participant?.jemaat ?? (c.note || null),
        note: c.note || null,
        photo: c.photo ?? c.participant?.photo ?? null,
        votes,
      };
    })
    .concat(
      targetStage.allowAbstain
        ? [{ id: "abstain", name: "Golput", jemaat: null, note: null, photo: null, votes: abstainCount }]
        : []
    )
    .sort((a, b) => b.votes - a.votes);

  const results: ResultRow[] = raw.map((r, i) => {
    const p = pct(r.votes, totalVotes || 1);
    if (revealed) {
      return { ...r, initials: initials(r.name), pct: p };
    }
    // Voting phase: mask name / jemaat / photo, keep the live vote count + ranking.
    return {
      id: r.id,
      name: r.id === "abstain" ? "Golput" : `Anonymous ${String(i + 1).padStart(2, "0")}`,
      jemaat: null,
      note: null,
      photo: null,
      initials: null,
      votes: r.votes,
      pct: p,
    };
  });

  // Golput can't "win" — only real candidates are eligible. When two or more
  // are tied for the top vote count (relevant for the final stage's reveal),
  // every one of them is a winner, not just whichever sorted first.
  const candidatePool = raw.filter((r) => r.id !== "abstain");
  const topVotes = candidatePool[0]?.votes ?? 0;
  const winners: ResultRow[] =
    revealed && topVotes > 0
      ? candidatePool
          .filter((r) => r.votes === topVotes)
          .map((r) => ({ ...r, initials: initials(r.name), pct: pct(r.votes, totalVotes || 1) }))
      : [];
  const winner = winners[0] ?? null;
  const isTie = winners.length > 1;
  const isFinalStage = targetStage.order === maxOrder;

  return {
    phase,
    votingComplete,
    revealed,
    resultsOpen: Boolean(targetStage.resultsOpen),
    canOpenResult: votedCount >= totalVoters && totalVoters > 0,
    stageName: targetStage.name,
    stageOrder: targetStage.order,
    isFinalStage,
    stageSequence,
    notStarted,
    live: targetStage.status === "VOTING",
    totalVoters,
    totalVotes,
    votedCount,
    checkedInCount,
    checkInPct: pct(checkedInCount, totalVoters || 1),
    votingPct: pct(votedCount, totalVoters || 1),
    denom: totalVoters || 1,
    registered,
    registrationPct: pct(registered, totalVoters || 1),
    results,
    winnerId: winner?.id ?? null,
    winnerName: winner?.name ?? null,
    winnerNote: winner?.note ?? null,
    winnerPhoto: winner?.photo ?? null,
    winners,
    isTie,
  };
}

export type ResultsSnapshot = NonNullable<Awaited<ReturnType<typeof getResultsSnapshot>>>;
