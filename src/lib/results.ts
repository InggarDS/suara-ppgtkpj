import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/ids";
import { pct } from "@/lib/format";

export async function getResultsSnapshot(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      stages: {
        orderBy: { order: "desc" },
        include: { candidates: { orderBy: { order: "asc" } }, votes: true },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!event) return null;

  const registered = await prisma.participant.count({ where: { eventId, registeredAt: { not: null } } });
  const denom = event.expectedParticipants || event._count.participants || 1;
  const registrationPct = pct(registered, denom);

  const stageSequence = [...event.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ order: s.order, name: s.name, status: s.status }));
  const maxOrder = stageSequence.length ? Math.max(...stageSequence.map((s) => s.order)) : 0;

  const targetStage = event.stages.find((s) => s.status === "LIVE") ?? event.stages.find((s) => s.status === "COMPLETED") ?? event.stages[0];
  if (!targetStage) {
    return {
      revealed: event.resultsRevealed,
      stageName: null,
      stageOrder: 0,
      isFinalStage: false,
      stageSequence,
      live: false,
      totalVotes: 0,
      denom,
      registered,
      registrationPct,
      results: [],
      winnerId: null,
      winnerName: null,
      winnerNote: null,
      winnerPhoto: null,
    };
  }

  const votesByCandidate = new Map<string, number>();
  let abstainCount = 0;
  for (const v of targetStage.votes) {
    if (v.isAbstain) abstainCount++;
    else if (v.candidateId) votesByCandidate.set(v.candidateId, (votesByCandidate.get(v.candidateId) ?? 0) + 1);
  }
  const totalVotes = targetStage.votes.length;

  const results = targetStage.candidates
    .map((c) => {
      const votes = votesByCandidate.get(c.id) ?? 0;
      return { id: c.id, name: c.name, note: c.note, photo: c.photo, votes, pct: pct(votes, totalVotes || 1) };
    })
    .concat(
      targetStage.allowAbstain
        ? [{ id: "abstain", name: "Golput", note: "", photo: null, votes: abstainCount, pct: pct(abstainCount, totalVotes || 1) }]
        : []
    );

  const winner = results.reduce((max, r) => (r.votes > (max?.votes ?? -1) ? r : max), results[0]);
  const isFinalStage = targetStage.order === maxOrder;

  return {
    revealed: event.resultsRevealed,
    stageName: targetStage.name,
    stageOrder: targetStage.order,
    isFinalStage,
    stageSequence,
    live: targetStage.status === "LIVE",
    totalVotes,
    denom,
    registered,
    registrationPct,
    results: results.map((r) => ({ ...r, initials: initials(r.name) })),
    winnerId: winner?.id ?? null,
    winnerName: winner?.name ?? null,
    winnerNote: winner?.note ?? null,
    winnerPhoto: winner?.photo ?? null,
  };
}

export type ResultsSnapshot = NonNullable<Awaited<ReturnType<typeof getResultsSnapshot>>>;
