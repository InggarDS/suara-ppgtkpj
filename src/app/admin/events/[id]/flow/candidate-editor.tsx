"use client";

import { useState, useTransition } from "react";
import { addCandidateAction, removeCandidateAction } from "./actions";

type Candidate = { id: string; name: string };

export default function CandidateEditor({
  eventId,
  stageId,
  candidates,
}: {
  eventId: string;
  stageId: string;
  candidates: Candidate[];
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 pt-3 border-t border-border-5 flex flex-col gap-2">
      {candidates.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <span className="flex-1 text-xs text-body">{c.name}</span>
          <button
            onClick={() => startTransition(() => { void removeCandidateAction(eventId, c.id); })}
            className="text-[11px] text-faint hover:text-danger"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add candidate name"
          className="flex-1 border border-border-1 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-brand"
        />
        <button
          disabled={!name.trim() || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await addCandidateAction(eventId, stageId, name, "");
              if (res.ok) setName("");
            })
          }
          className="text-xs font-medium text-brand bg-brand-soft rounded-md px-2.5 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
