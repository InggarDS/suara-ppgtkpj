"use client";

import { useState, useTransition } from "react";
import { BusyLabel } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  openResultsAction,
  openStageAction,
  restartVotingAction,
  startVotingAction,
  stopVotingAction,
} from "./actions";

type Stage = { id: string; name: string; status: string; resultsOpen: boolean };

export default function StageControls({
  eventId,
  stage,
  checkedInCount,
  votesCount,
}: {
  eventId: string;
  stage: Stage;
  checkedInCount: number;
  votesCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());

  const btn = "inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-full px-3.5 py-2 cursor-pointer disabled:opacity-50 transition-colors";
  const primary = `${btn} btn-gradient`;
  const ghost = `${btn} border border-border-1 text-ink bg-card hover:border-brand hover:text-brand`;
  const danger = `${btn} border border-danger-border text-danger bg-card hover:bg-danger-bg-hover`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stage.status === "NOT_STARTED" && (
        <button disabled={pending} onClick={() => run(() => openStageAction(eventId, stage.id))} className={primary}>
          <BusyLabel busy={pending} busyText="Opening…">Open stage</BusyLabel>
        </button>
      )}

      {stage.status === "CHECK_IN" && (
        <>
          <span className="text-[11.5px] font-medium text-brand bg-brand-soft rounded-full px-2.5 py-1">
            {checkedInCount} checked in
          </span>
          <button disabled={pending} onClick={() => run(() => startVotingAction(eventId, stage.id))} className={primary}>
            <BusyLabel busy={pending} busyText="Starting…">Start voting</BusyLabel>
          </button>
        </>
      )}

      {stage.status === "VOTING" && (
        <>
          <span className="text-[11.5px] font-medium text-brand bg-brand-soft rounded-full px-2.5 py-1">
            {votesCount} votes · {checkedInCount} checked in
          </span>
          <button disabled={pending} onClick={() => run(() => stopVotingAction(eventId, stage.id))} className={ghost}>
            <BusyLabel busy={pending} busyText="Stopping…">Stop voting</BusyLabel>
          </button>
          <button disabled={pending} onClick={() => setConfirmRestart(true)} className={danger}>
            Restart voting
          </button>
        </>
      )}

      {stage.status === "STOPPED" && (
        <>
          <span className="text-[11.5px] font-medium text-faint bg-border-5 rounded-full px-2.5 py-1">
            {votesCount} votes · stopped
          </span>
          <button disabled={pending} onClick={() => run(() => openStageAction(eventId, stage.id))} className={ghost}>
            <BusyLabel busy={pending} busyText="Opening…">Re-open check-in</BusyLabel>
          </button>
          <button disabled={pending} onClick={() => run(() => startVotingAction(eventId, stage.id))} className={ghost}>
            <BusyLabel busy={pending} busyText="Starting…">Resume voting</BusyLabel>
          </button>
          <button disabled={pending} onClick={() => setConfirmRestart(true)} className={danger}>
            Restart voting
          </button>
        </>
      )}

      {(stage.status === "VOTING" || stage.status === "STOPPED") && (
        <button
          disabled={pending}
          onClick={() => run(() => openResultsAction(eventId, stage.id, !stage.resultsOpen))}
          className={stage.resultsOpen ? ghost : primary}
        >
          <BusyLabel busy={pending} busyText="Working…">
            {stage.resultsOpen ? "Hide result" : "Open result"}
          </BusyLabel>
        </button>
      )}

      <ConfirmDialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title={`Restart voting for "${stage.name}"?`}
        body="Every vote cast in this stage will be deleted and voting reopens from scratch. Checked-in participants stay checked in and can vote again. This cannot be undone."
        confirmWord="RESTART"
        ctaLabel="Restart voting"
        action={async () => restartVotingAction(eventId, stage.id)}
      />
    </div>
  );
}
