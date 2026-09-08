import { NextRequest, NextResponse } from "next/server";
import { getParticipantState } from "@/lib/participant-state";

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const state = await getParticipantState(publicId, req.nextUrl.searchParams.get("token"));
  if (!state) return NextResponse.json({ error: "tidak ditemukan" }, { status: 404 });
  return NextResponse.json(state);
}
