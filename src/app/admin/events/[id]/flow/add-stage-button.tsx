"use client";

import { useState, useTransition } from "react";
import { BusyLabel } from "@/components/ui/spinner";
import { addStageAction } from "./actions";

export default function AddStageButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [candidates, setCandidates] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await addStageAction(eventId, name, candidates.split("\n"));
      if (res.ok) {
        setOpen(false);
        setName("");
        setCandidates("");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start border border-dashed border-border-2 bg-transparent rounded-[18px] px-4 py-2.5 text-[13px] text-faint cursor-pointer flex items-center gap-2 hover:border-brand hover:text-brand"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"></path>
        </svg>
        Add stage
      </button>
    );
  }

  return (
    <div className="border-[1.5px] border-border-1 bg-card rounded-[20px] p-4.5 flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Stage name"
        className="border border-border-1 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
        autoFocus
      />
      <textarea
        value={candidates}
        onChange={(e) => setCandidates(e.target.value)}
        placeholder={"Candidate names, one per line"}
        rows={3}
        className="border border-border-1 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand resize-none"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="text-xs text-body px-3 py-1.5 rounded-md border border-border-1">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || pending}
          className="text-xs font-semibold text-white bg-brand rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          <BusyLabel busy={pending} busyText="Adding…">Add stage</BusyLabel>
        </button>
      </div>
    </div>
  );
}
