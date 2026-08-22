import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maybeAutoAdvance } from "@/lib/stage-transition";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  candidateId: z.string().optional(),
  abstain: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  const { token, candidateId, abstain } = body.data;

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { stages: { where: { status: "LIVE" }, include: { candidates: true } } },
  });
  if (!event) return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  if (event.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "This event is closed." }, { status: 403 });

  const liveStage = event.stages[0];
  if (!liveStage) return NextResponse.json({ ok: false, error: "No stage is open for voting right now." }, { status: 409 });

  const participant = await prisma.participant.findFirst({ where: { eventId: event.id, token: token.trim().toUpperCase() } });
  if (!participant || !participant.registeredAt) {
    return NextResponse.json({ ok: false, error: "Register before voting." }, { status: 403 });
  }

  if (!abstain && (!candidateId || !liveStage.candidates.some((c) => c.id === candidateId))) {
    return NextResponse.json({ ok: false, error: "Choose a candidate." }, { status: 400 });
  }

  const existing = await prisma.vote.findUnique({
    where: { stageId_participantId: { stageId: liveStage.id, participantId: participant.id } },
  });
  if (existing) return NextResponse.json({ ok: true, alreadyVoted: true });

  await prisma.vote.create({
    data: {
      stageId: liveStage.id,
      participantId: participant.id,
      candidateId: abstain ? null : candidateId,
      isAbstain: Boolean(abstain),
    },
  });

  await maybeAutoAdvance(liveStage.id);

  return NextResponse.json({ ok: true });
}
