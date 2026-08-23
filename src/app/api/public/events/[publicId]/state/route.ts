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
  if (!event) return NextResponse.json({ error: "not found" }, { status: 404 });

  const liveStage = event.stages.find((s) => s.status === "LIVE");
  const completedStages = event.stages.filter((s) => s.status === "COMPLETED");
  const lastCompletedStage = completedStages.length ? completedStages[completedStages.length - 1] : null;
  const eventFinished = event.stages.length > 0 && !liveStage && event.stages.every((s) => s.status === "COMPLETED");

  const base = {
    eventName: event.name,
    eventStatus: event.status,
    bannerImage: event.bannerImage,
    useCredentials: event.useCredentials,
    closed: event.status !== "ACTIVE",
    totalStages: event.stages.length,
    stages: event.stages.map((s) => ({ order: s.order, name: s.name, status: s.status })),
    lastCompletedStage: lastCompletedStage ? { order: lastCompletedStage.order, name: lastCompletedStage.name } : null,
    eventFinished,
    liveStage: liveStage
      ? {
          id: liveStage.id,
          order: liveStage.order,
          name: liveStage.name,
          allowAbstain: liveStage.allowAbstain,
          candidates: liveStage.candidates.map((c) => ({ id: c.id, name: c.name, note: c.note, photo: c.photo })),
        }
      : null,
  };

  if (!token) return NextResponse.json({ ...base, valid: false });

  const participant = await prisma.participant.findFirst({
    where: { eventId: event.id, token },
    include: { votes: true },
  });
  if (!participant) return NextResponse.json({ ...base, valid: false });

  const votedLiveStage = liveStage ? participant.votes.some((v) => v.stageId === liveStage.id) : false;

  return NextResponse.json({
    ...base,
    valid: true,
    registered: Boolean(participant.registeredAt),
    name: participant.name,
    token: participant.token,
    votedLiveStage,
  });
}
