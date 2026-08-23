"use client";

import { useTransition } from "react";
import { archiveEventAction } from "./actions";

export default function ArchiveButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => archiveEventAction(eventId))}
      className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[rgba(150,170,255,.16)] disabled:opacity-50"
    >
      {pending ? "Archiving…" : "Move to archive"}
    </button>
  );
}
