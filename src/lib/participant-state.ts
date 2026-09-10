import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { cached, cacheKeys } from "@/lib/cache";

/** publicId -> internal event id, cached 5 min so a cache hit on the state
 *  snapshot doesn't cost a Postgres round-trip just to know the index key. */
async function eventIdForPublic(publicId: string): Promise<string | null> {
  return cached(
    cacheKeys.pubToId(publicId),
    async () =>
      (await prisma.event.findUnique({ where: { publicId }, select: { id: true } }))?.id ?? null,
    { ttl: 300 },
  );
}

/**
 * The participant-facing view of an event's live state. Shared by the REST
 * endpoint and the SSE stream so there is one source of truth.
 * Returns `null` when the event does not exist.
 *
 * Tier 1: cached in Redis per (publicId, token) with a short TTL, and cleared on
 * every `publish()` for the event. Falls straight through to the DB without Redis.
 */
export async function getParticipantState(publicId: string, rawToken?: string | null) {
  const token = rawToken?.trim().toUpperCase() || null;
  const tokenHash = token
    ? createHash("sha1").update(token).digest("hex").slice(0, 16)
    : "anon";
  const eventId = await eventIdForPublic(publicId);

  return cached(
    cacheKeys.participantState(publicId, tokenHash),
    () => loadParticipantState(publicId, token),
    { indexKey: eventId ? cacheKeys.eventIndex(eventId) : undefined },
  );
}

async function loadParticipantState(publicId: string, token: string | null) {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          candidates: {
            orderBy: { order: "asc" },
            // Linked participant is the live source for photo / jemaat, so a
            // photo uploaded AFTER the person was sent as a candidate still shows.
            include: { participant: { select: { photo: true, jemaat: true } } },
          },
        },
      },
    },
  });
  if (!event) return null;

  const activeStage = event.stages.find((s) => s.status === "CHECK_IN" || s.status === "VOTING") ?? null;
  const phase: "checkin" | "voting" | null = activeStage
    ? activeStage.status === "VOTING"
      ? "voting"
      : "checkin"
    : null;
  const stoppedStages = event.stages.filter((s) => s.status === "STOPPED" || s.status === "CLOSED");
  const lastStoppedStage = stoppedStages.length ? stoppedStages[stoppedStages.length - 1] : null;
  const eventFinished =
    event.stages.length > 0 &&
    !activeStage &&
    event.stages.some((s) => s.status === "STOPPED" || s.status === "CLOSED");

  const base = {
    eventName: event.name,
    eventStatus: event.status,
    bannerImage: event.bannerImage,
    useCredentials: event.useCredentials,
    closed: event.status !== "ACTIVE",
    totalStages: event.stages.length,
    stages: event.stages.map((s) => ({ order: s.order, name: s.name, status: s.status })),
    lastCompletedStage: lastStoppedStage ? { order: lastStoppedStage.order, name: lastStoppedStage.name } : null,
    eventFinished,
    liveStage: activeStage
      ? {
          id: activeStage.id,
          order: activeStage.order,
          name: activeStage.name,
          phase,
          allowAbstain: activeStage.allowAbstain,
          candidates:
            phase === "voting"
              ? activeStage.candidates.map((c) => {
                  const jemaat = c.participant?.jemaat ?? null;
                  return {
                    id: c.id,
                    name: c.name,
                    note: c.note || (jemaat ? `Jemaat ${jemaat}` : ""),
                    jemaat,
                    photo: c.photo ?? c.participant?.photo ?? null,
                  };
                })
              : [],
        }
      : null,
  };

  if (!token) return { ...base, valid: false as const };

  const participant = await prisma.participant.findFirst({
    where: { eventId: event.id, token },
    include: { votes: true },
  });
  if (!participant) return { ...base, valid: false as const };

  const votedLiveStage = activeStage ? participant.votes.some((v) => v.stageId === activeStage.id) : false;
  const checkedIn = activeStage
    ? Boolean(
        await prisma.stageCheckIn.findUnique({
          where: { stageId_participantId: { stageId: activeStage.id, participantId: participant.id } },
        })
      )
    : false;

  return {
    ...base,
    valid: true as const,
    registered: Boolean(participant.registeredAt),
    name: participant.name,
    token: participant.token,
    votedLiveStage,
    checkedIn,
  };
}
