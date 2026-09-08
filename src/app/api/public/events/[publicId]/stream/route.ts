import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParticipantState } from "@/lib/participant-state";
import { subscribe } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  const event = await prisma.event.findUnique({ where: { publicId }, select: { id: true } });
  if (!event) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const push = async () => send(await getParticipantState(publicId, token));

      void push();
      const unsubscribe = subscribe(event.id, () => void push());
      const heal = setInterval(() => void push(), 5000);
      const ping = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            closed = true;
          }
        }
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heal);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
