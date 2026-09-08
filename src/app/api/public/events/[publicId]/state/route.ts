import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const token = req.nextUrl.searchParams.get("token")?.trim().toUpperCase();

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: { candidates: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "tidak ditemukan" }, { status: 404 });

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
              ? activeStage.candidates.map((c) => ({ id: c.id, name: c.name, note: c.note, photo: c.photo }))
              : [],
        }
      : null,
  };

  if (!token) return NextResponse.json({ ...base, valid: false });

  const participant = await prisma.participant.findFirst({
    where: { eventId: event.id, token },
    include: { votes: true },
  });
  if (!participant) return NextResponse.json({ ...base, valid: false });

  const votedLiveStage = activeStage ? participant.votes.some((v) => v.stageId === activeStage.id) : false;
  const checkedIn = activeStage
    ? Boolean(
        await prisma.stageCheckIn.findUnique({
          where: { stageId_participantId: { stageId: activeStage.id, participantId: participant.id } },
        })
      )
    : false;

  return NextResponse.json({
    ...base,
    valid: true,
    registered: Boolean(participant.registeredAt),
    name: participant.name,
    token: participant.token,
    votedLiveStage,
    checkedIn,
  });
}
