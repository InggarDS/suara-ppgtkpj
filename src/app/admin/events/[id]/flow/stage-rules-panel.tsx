"use client";

import { useTransition } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Spinner } from "@/components/ui/spinner";
import StageControls from "./stage-controls";
import { updateStageRulesAction } from "./actions";

type Stage = {
  id: string;
  name: string;
  status: string;
  resultsOpen: boolean;
  allowAbstain: boolean;
  requireFingerprint: boolean;
  _count: { votes: number; checkIns: number };
};

export default function StageRulesPanel({
  eventId,
  stage,
  totalVoters,
  locked = false,
  disabled = false,
}: {
  eventId: string;
  stage: Stage;
  totalVoters: number;
  locked?: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const toggles: { key: "allowAbstain" | "requireFingerprint"; label: string; hint: string }[] = [
    { key: "allowAbstain", label: "Allow abstain", hint: 'Adds a "Golput" option to the ballot' },
    { key: "requireFingerprint", label: "Device fingerprinting", hint: "Block a second device on the same token" },
  ];

  return (
    <div className="bg-card border border-border-1 rounded-xl p-4.5 flex flex-col gap-4.5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <div className="text-[13px] font-semibold text-ink">{stage.name}</div>
          <span
            className={`inline-flex items-center gap-1 text-[10.5px] font-medium text-brand transition-opacity ${
              pending ? "opacity-100" : "opacity-0"
            }`}
          >
            <Spinner className="w-3 h-3" />
            Saving…
          </span>
        </div>
        <div className="text-[11.5px] text-faint">Controls for the current stage.</div>
      </div>

      <StageControls
        eventId={eventId}
        stage={{ id: stage.id, name: stage.name, status: stage.status, resultsOpen: stage.resultsOpen }}
        checkedInCount={stage._count.checkIns}
        votesCount={stage._count.votes}
        totalVoters={totalVoters}
        locked={locked}
        disabled={disabled}
      />

      <div className="h-px bg-border-4" />

      {toggles.map((t) => (
        <div key={t.key} className="flex items-center gap-2.5">
          <span className="flex-1">
            <span className="block text-[12.5px] font-medium text-ink">{t.label}</span>
            <span className="block text-[11px] text-faint leading-snug">{t.hint}</span>
          </span>
          <Toggle
            on={stage[t.key]}
            disabled={pending || disabled || stage.status !== "NOT_STARTED"}
            onToggle={() =>
              startTransition(() => {
                void updateStageRulesAction(eventId, stage.id, { [t.key]: !stage[t.key] });
              })
            }
          />
        </div>
      ))}
      {stage.status !== "NOT_STARTED" && (
        <div className="text-[11px] text-faint -mt-2">Settings lock once a stage is opened.</div>
      )}
    </div>
  );
}
