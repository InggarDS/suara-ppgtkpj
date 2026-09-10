"use client";

import { useMemo, useState, useTransition } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Spinner } from "@/components/ui/spinner";
import StageControls from "./stage-controls";
import { promoteTopCandidatesAction, updateStageRulesAction } from "./actions";

type Stage = {
  id: string;
  name: string;
  status: string;
  resultsOpen: boolean;
  allowAbstain: boolean;
  requireFingerprint: boolean;
  promoteCount: number;
  _count: { votes: number; checkIns: number };
  candidates: { id: string; name: string; votes: number }[];
};

export default function StageRulesPanel({
  eventId,
  stage,
  nextStage,
  totalVoters,
  locked = false,
  disabled = false,
}: {
  eventId: string;
  stage: Stage;
  nextStage: { name: string; status: string } | null;
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
        <div className="text-[11.5px] text-faint">Klik stage mana pun di kiri untuk mengatur di sini.</div>
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

      {nextStage && (
        <>
          <div className="h-px bg-border-4" />
          <PromotePanel eventId={eventId} stage={stage} nextStage={nextStage} disabled={disabled} />
        </>
      )}
    </div>
  );
}

function PromotePanel({
  eventId,
  stage,
  nextStage,
  disabled,
}: {
  eventId: string;
  stage: Stage;
  nextStage: { name: string; status: string };
  disabled: boolean;
}) {
  const [count, setCount] = useState(stage.promoteCount);
  const [serverCount, setServerCount] = useState(stage.promoteCount);
  const [savingCount, startSaveCount] = useTransition();
  const [promoting, startPromote] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Adjust the local input when the persisted value changes (realtime refresh /
  // another admin). Render-phase reconciliation — the sanctioned pattern.
  if (stage.promoteCount !== serverCount) {
    setServerCount(stage.promoteCount);
    setCount(stage.promoteCount);
  }

  const nextEditable = nextStage.status === "NOT_STARTED";

  const ranked = useMemo(
    () => [...stage.candidates].sort((a, b) => b.votes - a.votes).slice(0, Math.max(0, count)),
    [stage.candidates, count]
  );
  const hasVotes = ranked.some((c) => c.votes > 0);

  function saveCount(next: number) {
    const clamped = Math.max(0, Math.min(999, Math.floor(next) || 0));
    setCount(clamped);
    startSaveCount(() => {
      void updateStageRulesAction(eventId, stage.id, { promoteCount: clamped });
    });
  }

  function promote() {
    setNotice(null);
    startPromote(async () => {
      const res = await promoteTopCandidatesAction(eventId, stage.id);
      if (res.ok) {
        setNotice({
          kind: "ok",
          text: `${res.promoted} kandidat dipromosikan ke "${nextStage.name}"${
            res.skipped ? ` · ${res.skipped} dilewati (sudah ada)` : ""
          }.`,
        });
      } else {
        setNotice({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[12.5px] font-semibold text-ink">Promosi ke stage berikutnya</div>
        <div className="text-[11px] text-faint leading-snug">
          Kandidat dengan suara terbanyak yang lolos ke <span className="font-medium text-ink">{nextStage.name}</span>.
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <label className="text-[12px] text-body flex-1">Jumlah kandidat lolos</label>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || !nextEditable || count <= 0}
            onClick={() => saveCount(count - 1)}
            className="w-7 h-7 rounded-md border border-border-1 text-ink disabled:opacity-40 hover:border-brand"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            value={count}
            disabled={disabled || !nextEditable}
            onChange={(e) => setCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            onBlur={() => count !== stage.promoteCount && saveCount(count)}
            className="w-12 text-center border border-border-1 rounded-md py-1.5 text-[13px] text-ink bg-card outline-none focus:border-brand disabled:opacity-60"
          />
          <button
            type="button"
            disabled={disabled || !nextEditable}
            onClick={() => saveCount(count + 1)}
            className="w-7 h-7 rounded-md border border-border-1 text-ink disabled:opacity-40 hover:border-brand"
          >
            +
          </button>
          {savingCount && <Spinner className="w-3 h-3 text-brand ml-1" />}
        </div>
      </div>

      {!nextEditable && (
        <div className="text-[11px] text-amber-text bg-amber-bg border border-amber-border rounded-md px-2.5 py-1.5">
          &quot;{nextStage.name}&quot; sudah dimulai — kandidat terkunci, aturan tidak dapat diubah.
        </div>
      )}

      {count > 0 && (
        <div className="border border-border-4 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-paper-2 border-b border-border-4 font-mono text-[9.5px] tracking-[.08em] uppercase text-fainter">
            {count} besar saat ini
          </div>
          {ranked.length === 0 ? (
            <div className="px-3 py-2 text-[11.5px] text-faint">Belum ada kandidat di stage ini.</div>
          ) : (
            ranked.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border-5 last:border-b-0">
                <span className="font-mono text-[10px] text-faint w-4">{i + 1}</span>
                <span className="flex-1 text-[12px] text-ink truncate">{c.name}</span>
                <span className="text-[11px] font-medium text-body">{c.votes} suara</span>
              </div>
            ))
          )}
        </div>
      )}

      <button
        type="button"
        disabled={disabled || !nextEditable || count <= 0 || !hasVotes || promoting}
        onClick={promote}
        className="text-[12px] font-semibold btn-gradient rounded-full px-3.5 py-2 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        title={!hasVotes ? "Belum ada suara untuk diperingkat" : undefined}
      >
        {promoting && <Spinner className="w-3.5 h-3.5" />}
        Kirim {count > 0 ? count : ""} besar ke &quot;{nextStage.name}&quot;
      </button>

      <p className="text-[10.5px] text-faint leading-snug">
        Tombol <span className="font-medium">→ next</span> di tiap kandidat tetap bisa dipakai untuk promosi manual satu per satu.
      </p>

      {notice && (
        <p className={`text-[11.5px] ${notice.kind === "ok" ? "text-brand" : "text-danger"}`}>{notice.text}</p>
      )}
    </div>
  );
}
