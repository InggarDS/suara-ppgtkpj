"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteEventAction, fullResetAction, resetVotesAction } from "./actions";

export default function DangerZone({ eventId }: { eventId: string }) {
  const [kind, setKind] = useState<"votes" | "full" | "delete" | null>(null);

  const configs = {
    votes: {
      title: "Reset all votes?",
      body: "Every vote log for this event will be deleted. Participants stay registered and will be able to vote again from the current stage.",
      word: "RESET",
      cta: "Reset votes",
    },
    full: {
      title: "Permanently delete this event's data?",
      body: "All votes, all participant records and their uploaded photos will be erased, and every later stage's candidate list (auto-selected or added during the run) is cleared back to just Stage 1. This cannot be undone — export the audit log first.",
      word: "DELETE",
      cta: "Delete everything",
    },
    delete: {
      title: "Permanently delete this event?",
      body: "The event, its stages, candidates, participants, votes and audit trail are all erased for good. There is no undo — export the audit log first if you need a record.",
      word: "DELETE EVENT",
      cta: "Delete event",
    },
  } as const;

  const config = configs[kind ?? "votes"];

  return (
    <div className="border border-danger-border bg-danger-bg rounded-xl p-5">
      <div className="text-sm font-semibold text-danger mb-3.5">Danger zone</div>
      <div className="flex items-center gap-4 pb-3.5 border-b border-[rgba(255,92,122,.28)]">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink">Reset votes</div>
          <div className="text-xs text-body leading-relaxed">Clears every vote log. Participants and their photos stay registered and can vote again.</div>
        </div>
        <button
          onClick={() => setKind("votes")}
          className="text-[12.5px] font-medium text-danger bg-card border border-danger-border rounded-lg px-3.5 py-2 cursor-pointer flex-none hover:bg-danger-bg-hover"
        >
          Reset votes
        </button>
      </div>
      <div className="flex items-center gap-4 py-3.5 border-b border-[rgba(255,92,122,.28)]">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink">Full reset</div>
          <div className="text-xs text-body leading-relaxed">Permanently deletes all votes, participants, uploaded photos, and later-stage candidate lists for this event. Requires double confirmation.</div>
        </div>
        <button
          onClick={() => setKind("full")}
          className="text-[12.5px] font-medium text-white bg-danger border-none rounded-lg px-3.5 py-2.5 cursor-pointer flex-none hover:bg-danger-hover"
        >
          Full reset
        </button>
      </div>
      <div className="flex items-center gap-4 pt-3.5">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink">Delete event</div>
          <div className="text-xs text-body leading-relaxed">Removes the event entirely, including its history. Use this instead of archiving when the event should stop existing.</div>
        </div>
        <button
          onClick={() => setKind("delete")}
          className="text-[12.5px] font-medium text-white bg-danger border-none rounded-lg px-3.5 py-2.5 cursor-pointer flex-none hover:bg-danger-hover"
        >
          Delete event
        </button>
      </div>

      <ConfirmDialog
        open={kind !== null}
        onClose={() => setKind(null)}
        title={config.title}
        body={config.body}
        confirmWord={config.word}
        ctaLabel={config.cta}
        action={async () => {
          if (kind === "full") return fullResetAction(eventId);
          if (kind === "delete") return deleteEventAction(eventId);
          return resetVotesAction(eventId);
        }}
      />
    </div>
  );
}
