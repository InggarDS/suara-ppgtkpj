"use client";

import { useState, useTransition } from "react";
import { BusyLabel } from "@/components/ui/spinner";

export type ConfirmResult = { ok: boolean; error?: string };

/**
 * Lightweight yes/no confirmation dialog (no typed keyword) for the
 * "Apakah Anda yakin…" prompts. For irreversible bulk destruction use
 * `ConfirmDialog` (typed word) instead.
 */
export function ConfirmModal({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  cancelLabel = "Batal",
  danger = false,
  action,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  action: () => Promise<ConfirmResult>;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit() {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setError(undefined);
        onClose();
      } else {
        setError(res.error || "Terjadi kesalahan.");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/42 flex items-center justify-center z-[60] p-6">
      <div className="elevated bg-card rounded-2xl max-w-[440px] w-full p-6 animate-rise-in">
        <div className="text-[16px] font-semibold text-ink mb-2 tracking-tight">{title}</div>
        <div className="mb-4.5 text-[13px] leading-relaxed text-body">{body}</div>
        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(undefined);
              onClose();
            }}
            className="text-[13px] font-medium text-ink-soft bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className={`text-[13px] font-semibold border-none rounded-lg px-3.5 py-2 cursor-pointer transition-colors disabled:opacity-50 ${
              danger ? "bg-danger text-white hover:bg-danger-hover" : "btn-gradient"
            }`}
          >
            <BusyLabel busy={pending} busyText="Memproses…">{confirmLabel}</BusyLabel>
          </button>
        </div>
      </div>
    </div>
  );
}
