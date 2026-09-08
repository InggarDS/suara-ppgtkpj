"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui/pill";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { initials } from "@/lib/ids";
import { reorderEventsAction, deleteEventFromListAction } from "../actions";

export type BoardEvent = {
  id: string;
  publicId: string;
  name: string;
  status: string;
  bannerImage: string | null;
  participants: number;
  stages: number;
  turnout: string;
  metaLabel: string;
};

export default function EventsBoard({ events }: { events: BoardEvent[] }) {
  const router = useRouter();
  const [items, setItems] = useState(events);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BoardEvent | null>(null);

  const itemsRef = useRef(events);
  const savedRef = useRef(events.map((e) => e.id).join(","));
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const dragIdRef = useRef<string | null>(null);
  const lastTargetRef = useRef<string | null>(null);

  function persistOrder() {
    const next = itemsRef.current;
    const key = next.map((e) => e.id).join(",");
    if (key === savedRef.current) return;
    savedRef.current = key;
    void reorderEventsAction(next.map((e) => e.id)).then(() => router.refresh());
  }

  function applyOrder(next: BoardEvent[]) {
    itemsRef.current = next;
    setItems(next);
  }

  function moveOver(targetId: string) {
    const cur = itemsRef.current;
    const src = dragIdRef.current;
    if (!src || src === targetId) return;
    const from = cur.findIndex((e) => e.id === src);
    const to = cur.findIndex((e) => e.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...cur];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyOrder(next);
  }

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    dragIdRef.current = id;
    lastTargetRef.current = id;
    setDragId(id);
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    const src = dragIdRef.current;
    if (!src) return;
    const y = e.clientY;
    for (const [id, el] of cardRefs.current) {
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        if (id !== lastTargetRef.current) {
          lastTargetRef.current = id;
          if (id !== src) moveOver(id);
        }
        break;
      }
    }
  }

  function onHandlePointerUp() {
    if (!dragIdRef.current) return;
    dragIdRef.current = null;
    lastTargetRef.current = null;
    setDragId(null);
    persistOrder();
  }

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((ev) => (
        <div
          key={ev.id}
          ref={(el) => {
            if (el) cardRefs.current.set(ev.id, el);
            else cardRefs.current.delete(ev.id);
          }}
          onClick={() => router.push(`/admin/events/${ev.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/admin/events/${ev.id}`);
            }
          }}
          className={`group relative flex overflow-hidden rounded-2xl surface-card cursor-pointer select-none transition-all min-h-[132px] ${
            dragId === ev.id ? "opacity-60 ring-2 ring-brand" : ""
          }`}
        >
          {/* full-bleed banner background */}
          <div className="absolute inset-0">
            {ev.bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ev.bannerImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ backgroundImage: "var(--gradient-brand)" }} />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(6,10,32,0.94) 0%, rgba(6,10,32,0.9) 34%, rgba(6,10,32,0.7) 66%, rgba(6,10,32,0.5) 100%)",
              }}
            />
          </div>

          {/* left ticket stub */}
          <div className="relative z-10 flex w-[186px] flex-none flex-col justify-between border-r border-dashed border-white/25 bg-[rgba(6,10,32,0.35)] p-4">
            <div className="flex items-center gap-2">
              <span
                role="button"
                tabIndex={-1}
                aria-label="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => onHandlePointerDown(e, ev.id)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                className="flex touch-none cursor-grab items-center text-white/45 transition-colors hover:text-white/90 active:cursor-grabbing"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="9" cy="6" r="1.6" />
                  <circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" />
                  <circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" />
                  <circle cx="15" cy="18" r="1.6" />
                </svg>
              </span>
              <Pill kind={ev.status} />
            </div>
            <div>
              <div className="font-mono text-[11px] tracking-[0.08em] text-white/80">{ev.publicId}</div>
              <div className="mt-1 text-[10.5px] text-white/45">{ev.metaLabel}</div>
            </div>
          </div>

          {/* right content */}
          <div className="relative z-10 flex flex-1 flex-col justify-between p-4 pr-14">
            <div className="text-2xl sm:text-[28px] font-extrabold uppercase tracking-tight leading-[1.05] text-white line-clamp-2">
              {ev.name || initials(ev.name)}
            </div>
            <div className="flex gap-6">
              <Stat label="Participants" value={String(ev.participants)} />
              <Stat label="Stages" value={String(ev.stages)} />
              <Stat label="Turnout" value={ev.turnout} />
            </div>
          </div>

          {/* delete */}
          <button
            type="button"
            aria-label={`Delete ${ev.name}`}
            onClick={(e) => {
              e.stopPropagation();
              setPendingDelete(ev);
            }}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/25 text-white/70 opacity-70 backdrop-blur-sm transition-all hover:bg-danger hover:text-white hover:opacity-100 group-hover:opacity-100"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" />
            </svg>
          </button>
        </div>
      ))}

      {pendingDelete && (
        <ConfirmDialog
          open
          onClose={() => setPendingDelete(null)}
          title={`Delete "${pendingDelete.name}"?`}
          body="This permanently removes the event and every participant, vote, stage, and audit record attached to it. This cannot be undone."
          confirmWord={pendingDelete.publicId.toUpperCase()}
          ctaLabel="Delete event"
          action={async () => {
            const res = await deleteEventFromListAction(pendingDelete.id);
            if (res.ok) {
              const next = itemsRef.current.filter((e) => e.id !== pendingDelete.id);
              savedRef.current = next.map((e) => e.id).join(",");
              applyOrder(next);
              router.refresh();
            }
            return res;
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/50">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
