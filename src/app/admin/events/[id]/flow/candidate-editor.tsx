"use client";

import { useState, useTransition } from "react";
import {
  addAllParticipantsAsCandidatesAction,
  addCandidateAction,
  addCandidateFromParticipantAction,
  removeCandidateAction,
} from "./actions";

type Candidate = { id: string; name: string };
type Participant = { id: string; name: string | null; jemaat: string | null };

export default function CandidateEditor({
  eventId,
  stageId,
  candidates,
  participants,
}: {
  eventId: string;
  stageId: string;
  candidates: Candidate[];
  participants: Participant[];
}) {
  const [mode, setMode] = useState<"participant" | "manual">(participants.length ? "participant" : "manual");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  const alreadyAdded = new Set(candidates.map((c) => c.name));
  const availableParticipants = participants.filter((p) => p.name && !alreadyAdded.has(p.name));

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

      <div className="flex gap-2 mb-1">
        <button
          onClick={() => setMode("participant")}
          className={`text-[11px] font-medium rounded-md px-2 py-1 cursor-pointer ${
            mode === "participant" ? "bg-brand-soft text-brand" : "bg-border-5 text-faint"
          }`}
        >
          From participants
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`text-[11px] font-medium rounded-md px-2 py-1 cursor-pointer ${
            mode === "manual" ? "bg-brand-soft text-brand" : "bg-border-5 text-faint"
          }`}
        >
          Manual
        </button>
      </div>

      {mode === "participant" ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 border border-border-1 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-brand bg-card"
            >
              <option value="">
                {availableParticipants.length ? "Select a registered participant…" : "No registered participants left"}
              </option>
              {availableParticipants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.jemaat ? ` · ${p.jemaat}` : ""}
                </option>
              ))}
            </select>
            <button
              disabled={!selected || pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await addCandidateFromParticipantAction(eventId, stageId, selected);
                  if (res.ok) setSelected("");
                })
              }
              className="text-xs font-medium text-brand bg-brand-soft rounded-md px-2.5 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {availableParticipants.length > 1 && (
            <button
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void addAllParticipantsAsCandidatesAction(
                    eventId,
                    stageId,
                    availableParticipants.map((p) => p.id)
                  );
                })
              }
              className="self-start text-[11px] font-medium text-brand hover:underline disabled:opacity-50"
            >
              Add all {availableParticipants.length} registered participants
            </button>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
