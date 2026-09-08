import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/ids";
import { pct, relativeTime } from "@/lib/format";

export async function getMonitorSnapshot(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: { _count: { select: { votes: true, checkIns: true } } },
      },
      participants: { select: { photo: true } },
    },
  });
  if (!event) return null;

  const participantCount = event.participants.length;
  const registered = await prisma.participant.count({ where: { eventId, registeredAt: { not: null } } });
  const totalVoters = registered;
  const denom = totalVoters || 1;
  const liveStage = event.stages.find((s) => s.status === "CHECK_IN" || s.status === "VOTING");
  const phase = liveStage ? (liveStage.status === "VOTING" ? "voting" : "checkin") : null;
  const votedThisStage = liveStage?._count.votes ?? 0;
  const checkedInThisStage = liveStage?._count.checkIns ?? 0;
  const participation = pct(votedThisStage, denom);
  const checkInPct = pct(checkedInThisStage, denom);
  const votingPct = pct(votedThisStage, denom);
  const canOpenResult = votedThisStage >= totalVoters && totalVoters > 0;

  const recentVotes = liveStage && phase === "voting"
    ? await prisma.vote.findMany({
        where: { stageId: liveStage.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { participant: true },
      })
    : [];
  const recentRegs = await prisma.participant.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const feedItems = [
    ...recentVotes.map((v) => ({
      name: v.participant.name ?? "Anonymous",
      action: `cast a vote · ${liveStage!.name}`,
      at: v.createdAt,
    })),
    ...recentRegs.map((r) => ({ name: r.name ?? "Anonymous", action: "registered", at: r.createdAt })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8)
    .map((f) => ({ initials: initials(f.name), name: f.name, action: f.action, ago: relativeTime(f.at) }));

  return {
    pct: participation,
    voted: votedThisStage,
    checkedIn: checkedInThisStage,
    totalVoters,
    checkInPct,
    votingPct,
    canOpenResult,
    denom,
    phase,
    liveStageName: liveStage?.name ?? null,
    liveStageId: liveStage?.id ?? null,
    kpis: [
      {
        label: "Participation",
        value: participation,
        unit: "%",
        delta: liveStage ? `${votedThisStage} of ${denom} voted` : "No live stage",
      },
      {
        label: "Checked in",
        value: checkedInThisStage,
        unit: liveStage ? `of ${denom}` : "—",
        delta: liveStage ? (phase === "voting" ? "Voting open" : "Check-in open") : "",
      },
      { label: "Votes cast", value: votedThisStage, unit: liveStage ? liveStage.name : "—", delta: "" },
      {
        label: "Registered",
        value: participantCount,
        unit: `of ${denom}`,
        delta: participantCount >= denom ? "All invites claimed" : `${denom - participantCount} pending`,
      },
    ],
    breakdown: event.stages.map((s) => ({
      label: `Stage ${s.order} · ${s.name}`,
      value: `${s._count.votes} / ${denom}`,
      w: pct(s._count.votes, denom),
    })),
    feed: feedItems,
  };
}

export type MonitorSnapshot = NonNullable<Awaited<ReturnType<typeof getMonitorSnapshot>>>;
