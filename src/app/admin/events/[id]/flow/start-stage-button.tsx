"use client";

import { useTransition } from "react";
import { startStageAction } from "./actions";

export default function StartStageButton({ eventId, stageId }: { eventId: string; stageId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { void startStageAction(eventId, stageId); })}
      className="text-[11.5px] font-semibold text-brand bg-brand-soft rounded-md px-2.5 py-1.5 cursor-pointer disabled:opacity-50"
    >
      {pending ? "Opening…" : "Open stage"}
    </button>
  );
}
