"use client";

import { useState, useTransition } from "react";
import { BusyLabel } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  closeStageAction,
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
  totalVoters,
  locked = false,
}: {
  eventId: string;
  stage: Stage;
  checkedInCount: number;
  votesCount: number;
  totalVoters: number;
  locked?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmForceStart, setConfirmForceStart] = useState(false);
  const [confirmForceResult, setConfirmForceResult] = useState(false);
  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn());

  const checkInComplete = totalVoters > 0 && checkedInCount >= totalVoters;
  const votingComplete = totalVoters > 0 && votesCount >= totalVoters;

  const btn = "inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-full px-3.5 py-2 cursor-pointer disabled:opacity-50 transition-colors";
  const primary = `${btn} btn-gradient`;
  const ghost = `${btn} border border-border-1 text-ink bg-card hover:border-brand hover:text-brand`;
  const danger = `${btn} border border-danger-border text-danger bg-card hover:bg-danger-bg-hover`;
  const chip = "text-[11.5px] font-medium rounded-full px-2.5 py-1";

  if (locked && stage.status === "NOT_STARTED") {
    return (
      <div className="flex items-center gap-2">
        <span className={`${chip} text-faint bg-border-5 inline-flex items-center gap-1.5`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <rect x="4" y="10.5" width="16" height="10" rx="2" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
          Locked — another stage is active
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stage.status === "NOT_STARTED" && (
        <button disabled={pending} onClick={() => run(() => openStageAction(eventId, stage.id))} className={primary}>
          <BusyLabel busy={pending} busyText="Opening…">Open stage</BusyLabel>
        </button>
      )}

      {stage.status === "CHECK_IN" && (
        <>
          <span className={`${chip} ${checkInComplete ? "text-brand bg-brand-soft" : "text-faint bg-border-5"}`}>
            {checkedInCount} / {totalVoters} checked in{totalVoters > 0 ? ` · ${Math.round((checkedInCount / totalVoters) * 100)}%` : ""}
          </span>
          <button
            disabled={pending || !checkInComplete}
            onClick={() => run(() => startVotingAction(eventId, stage.id))}
            className={primary}
            title={checkInComplete ? undefined : "Waiting for 100% check-in"}
          >
            <BusyLabel busy={pending} busyText="Starting…">Start voting</BusyLabel>
          </button>
          {!checkInComplete && (
            <button disabled={pending} onClick={() => setConfirmForceStart(true)} className={ghost}>
              Start anyway
            </button>
          )}
        </>
      )}

      {stage.status === "VOTING" && (
        <>
          <span className={`${chip} ${votingComplete ? "text-brand bg-brand-soft" : "text-faint bg-border-5"}`}>
            {votesCount} / {totalVoters} voted{totalVoters > 0 ? ` · ${Math.round((votesCount / totalVoters) * 100)}%` : ""}
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
          <span className={`${chip} text-faint bg-border-5`}>
            {votesCount} / {totalVoters} voted · stopped
          </span>
          <button disabled={pending} onClick={() => run(() => openStageAction(eventId, stage.id))} className={ghost}>
            <BusyLabel busy={pending} busyText="Opening…">Re-open check-in</BusyLabel>
          </button>
          <button disabled={pending} onClick={() => run(() => startVotingAction(eventId, stage.id, { force: true }))} className={ghost}>
            <BusyLabel busy={pending} busyText="Starting…">Resume voting</BusyLabel>
          </button>
          <button disabled={pending} onClick={() => setConfirmRestart(true)} className={danger}>
            Restart voting
          </button>
        </>
      )}

      {stage.status === "CLOSED" && (
        <span className={`${chip} text-faint bg-border-5`}>{votesCount} votes · stage closed</span>
      )}

      {(stage.status === "VOTING" || stage.status === "STOPPED" || stage.status === "CLOSED") && (
        <>
          {stage.resultsOpen || votingComplete || stage.status === "CLOSED" ? (
            <button
              disabled={pending}
              onClick={() => run(() => openResultsAction(eventId, stage.id, !stage.resultsOpen))}
              className={stage.resultsOpen ? ghost : primary}
            >
              <BusyLabel busy={pending} busyText="Working…">
                {stage.resultsOpen ? "Hide result" : "Open result"}
              </BusyLabel>
            </button>
          ) : (
            <>
              <button disabled className={ghost} title="Voting must reach 100% first">
                Open result — {votesCount}/{totalVoters}
              </button>
              <button disabled={pending} onClick={() => setConfirmForceResult(true)} className={ghost}>
                Open anyway
              </button>
            </>
          )}
        </>
      )}

      {(stage.status === "VOTING" || stage.status === "STOPPED") && (
        <button disabled={pending} onClick={() => setConfirmClose(true)} className={ghost}>
          Close stage
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

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title={`Close "${stage.name}" for good?`}
        body="The stage is marked final. Its votes and result are kept, but it can no longer be reopened, resumed or restarted from the flow."
        confirmWord="CLOSE"
        ctaLabel="Close stage"
        action={async () => closeStageAction(eventId, stage.id)}
      />

      <ConfirmDialog
        open={confirmForceStart}
        onClose={() => setConfirmForceStart(false)}
        title="Start voting before everyone has checked in?"
        body={`Only ${checkedInCount} of ${totalVoters} registered voters have checked in. Anyone who has not checked in will not be able to vote in this stage.`}
        confirmWord="START"
        ctaLabel="Start anyway"
        danger={false}
        action={async () => startVotingAction(eventId, stage.id, { force: true })}
      />

      <ConfirmDialog
        open={confirmForceResult}
        onClose={() => setConfirmForceResult(false)}
        title="Open the result before voting is complete?"
        body={`Only ${votesCount} of ${totalVoters} voters have voted. The result and ranking will be based on the votes cast so far.`}
        confirmWord="OPEN"
        ctaLabel="Open anyway"
        danger={false}
        action={async () => openResultsAction(eventId, stage.id, true, { force: true })}
      />
    </div>
  );
}
