import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getMonitorSnapshot } from "@/lib/monitor";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const snapshot = await getMonitorSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(snapshot);
}
