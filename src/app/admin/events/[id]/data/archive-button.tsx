"use client";

import { useTransition } from "react";
import { BusyLabel } from "@/components/ui/spinner";
import { archiveEventAction } from "./actions";

export default function ArchiveButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => archiveEventAction(eventId))}
      className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[rgba(27,77,228,.12)] disabled:opacity-50"
    >
      <BusyLabel busy={pending} busyText="Archiving…">Move to archive</BusyLabel>
    </button>
  );
}
