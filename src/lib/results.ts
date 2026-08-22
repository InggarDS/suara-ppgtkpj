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
    },
  });
  if (!event) return null;

  const targetStage = event.stages.find((s) => s.status === "LIVE") ?? event.stages.find((s) => s.status === "COMPLETED") ?? event.stages[0];
  if (!targetStage) return { revealed: event.resultsRevealed, stageName: null, live: false, totalVotes: 0, results: [] };

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
      return { id: c.id, name: c.name, votes, pct: pct(votes, totalVotes || 1) };
    })
    .concat(
      targetStage.allowAbstain
        ? [{ id: "abstain", name: "Golput", votes: abstainCount, pct: pct(abstainCount, totalVotes || 1) }]
        : []
    );

  const winner = results.reduce((max, r) => (r.votes > (max?.votes ?? -1) ? r : max), results[0]);

  return {
    revealed: event.resultsRevealed,
    stageName: targetStage.name,
    live: targetStage.status === "LIVE",
    totalVotes,
    denom: event.expectedParticipants || 1,
    results: results.map((r) => ({ ...r, initials: initials(r.name) })),
    winnerName: winner?.name ?? null,
  };
}

export type ResultsSnapshot = NonNullable<Awaited<ReturnType<typeof getResultsSnapshot>>>;
