import { NextRequest, NextResponse } from "next/server";
import { getParticipantState } from "@/lib/participant-state";

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const state = await getParticipantState(publicId, req.nextUrl.searchParams.get("token"));
  // "No such event" is a normal answer for the participant screen (deleted, or
  // never existed) — 200 with `gone: true`, not a 404, so useEventStream's
  // polling/SSE fallback picks it up as data instead of silently discarding it.
  return NextResponse.json(state ?? { gone: true });
}
