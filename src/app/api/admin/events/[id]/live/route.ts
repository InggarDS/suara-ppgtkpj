import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getResultsSnapshot } from "@/lib/results";
import { getMonitorSnapshot } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/** Non-streaming twin of /stream — the polling fallback for useEventStream. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const [results, monitor] = await Promise.all([getResultsSnapshot(id), getMonitorSnapshot(id)]);
  return NextResponse.json({ results, monitor });
}
