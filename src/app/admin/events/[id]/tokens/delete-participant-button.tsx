"use client";

import { useState, useTransition } from "react";
import { deleteParticipantAction } from "./actions";

export default function DeleteParticipantButton({ eventId, participantId }: { eventId: string; participantId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (armed) {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => { void deleteParticipantAction(eventId, participantId); })}
        onBlur={() => setArmed(false)}
        autoFocus
        className="text-[11px] font-medium text-white bg-danger rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50"
      >
        {pending ? "…" : "Confirm?"}
      </button>
    );
  }

  return (
    <button
      onClick={() => setArmed(true)}
      className="text-[11px] text-faint hover:text-danger cursor-pointer px-2 py-1.5"
    >
      Delete
    </button>
  );
}
