import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getResultsSnapshot } from "@/lib/results";
import { getMonitorSnapshot } from "@/lib/monitor";
import { subscribe } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
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

      const push = async () => {
        const [results, monitor] = await Promise.all([getResultsSnapshot(id), getMonitorSnapshot(id)]);
        send({ results, monitor });
      };

      void push();

      const unsubscribe = subscribe(id, () => void push());
      // Self-heal + keepalive so a missed emit or idle proxy never stalls the screen.
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
