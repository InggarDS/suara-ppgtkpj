"use client";

import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { sendCandidateToNextStageAction } from "./actions";

export default function PromoteCandidateButton({
  eventId,
  candidateId,
  nextStageName,
  disabled = false,
}: {
  eventId: string;
  candidateId: string;
  nextStageName: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-[10px] text-brand font-medium">→ {nextStageName}</span>;
  }

  return (
    <button
      type="button"
      disabled={pending || disabled}
      title={`Send to "${nextStageName}"`}
      onClick={() =>
        startTransition(async () => {
          const res = await sendCandidateToNextStageAction(eventId, candidateId);
          if (res.ok) setDone(true);
        })
      }
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-faint hover:text-brand disabled:opacity-50"
    >
      {pending ? <Spinner className="w-2.5 h-2.5" /> : "→"} next
    </button>
  );
}
