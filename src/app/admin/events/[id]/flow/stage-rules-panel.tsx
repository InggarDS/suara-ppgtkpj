"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/toggle";
import { closeStageAction, updateStageRulesAction } from "./actions";

type Stage = {
  id: string;
  name: string;
  status: string;
  thresholdMin: number;
  autoAdvance: boolean;
  allowAbstain: boolean;
  requireFingerprint: boolean;
  notifyOnQuorum: boolean;
};

export default function StageRulesPanel({ eventId, stage }: { eventId: string; stage: Stage }) {
  const [threshold, setThreshold] = useState(stage.thresholdMin);
  const [pending, startTransition] = useTransition();

  const toggles: { key: keyof Stage; label: string; hint: string }[] = [
    { key: "autoAdvance", label: "Auto-advance on threshold", hint: "Move to the next stage without admin action" },
    { key: "allowAbstain", label: "Allow abstain", hint: 'Adds a "Golput" option to the ballot' },
    { key: "requireFingerprint", label: "Device fingerprinting", hint: "Block a second device on the same token" },
    { key: "notifyOnQuorum", label: "Notify on quorum", hint: "Dashboard alert when the minimum is reached" },
  ];

  return (
    <div className="bg-card border border-border-1 rounded-xl p-4.5 flex flex-col gap-4.5">
      <div>
        <div className="text-[13px] font-semibold text-ink mb-0.5">{stage.name} rules</div>
        <div className="text-[11.5px] text-faint">
          {stage.status === "LIVE" ? "Applies to the live stage only" : "Configure before opening this stage"}
        </div>
      </div>
      <div>
        <label className="block text-[11.5px] font-medium text-body mb-1.5">Stage name</label>
        <div className="border border-border-1 rounded-lg px-2.5 py-2 text-[13px] text-ink bg-paper">{stage.name}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <label className="text-[11.5px] font-medium text-body">Minimum voters to advance</label>
          <span className="flex-1" />
          <span className="font-mono text-xs text-ink font-medium">{threshold}</span>
        </div>
        <input
          type="range"
          min={1}
          max={300}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          onMouseUp={() => startTransition(() => { void updateStageRulesAction(eventId, stage.id, { thresholdMin: threshold }); })}
          onTouchEnd={() => startTransition(() => { void updateStageRulesAction(eventId, stage.id, { thresholdMin: threshold }); })}
          className="w-full accent-brand"
        />
      </div>
      <div className="h-px bg-border-4" />
      {toggles.map((t) => (
        <div key={t.key} className="flex items-center gap-2.5">
          <span className="flex-1">
            <span className="block text-[12.5px] font-medium text-ink">{t.label}</span>
            <span className="block text-[11px] text-faint leading-snug">{t.hint}</span>
          </span>
          <Toggle
            on={Boolean(stage[t.key])}
            disabled={pending}
            onToggle={() =>
              startTransition(() => {
                void updateStageRulesAction(eventId, stage.id, { [t.key]: !stage[t.key] } as never);
              })
            }
          />
        </div>
      ))}
      {stage.status === "LIVE" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => { void closeStageAction(eventId, stage.id); })}
          className="text-[12.5px] font-semibold text-white bg-ink rounded-lg py-2.5 cursor-pointer disabled:opacity-50"
        >
          Close stage
        </button>
      )}
    </div>
  );
}
