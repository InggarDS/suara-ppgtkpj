"use client";

import { useState, useTransition } from "react";

export type ConfirmResult = { ok: boolean; error?: string };

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmWord,
  ctaLabel,
  danger = true,
  action,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmWord: string;
  ctaLabel: string;
  danger?: boolean;
  action: () => Promise<ConfirmResult>;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const armed = input.trim().toUpperCase() === confirmWord;

  function submit() {
    if (!armed) return;
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setInput("");
        setError(undefined);
        onClose();
      } else {
        setError(res.error || "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/42 flex items-center justify-center z-[60] p-6">
      <div className="bg-card rounded-2xl max-w-[430px] w-full p-6.5 shadow-2xl animate-rise-in">
        <div className="text-[17px] font-semibold text-ink mb-2 tracking-tight">{title}</div>
        <p className="mb-4.5 text-[13px] leading-relaxed text-body">{body}</p>
        <label className="block text-[11.5px] font-medium text-body mb-1.5">
          Type <strong className="font-mono text-danger">{confirmWord}</strong> to continue
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={confirmWord}
          className="w-full border border-border-1 rounded-lg px-3 py-2.5 font-mono text-[13px] text-ink outline-none bg-paper-2"
        />
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={() => {
              setInput("");
              setError(undefined);
              onClose();
            }}
            className="text-[13px] font-medium text-ink-soft bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!armed || pending}
            onClick={submit}
            className={`text-[13px] font-semibold border-none rounded-lg px-3.5 py-2 transition-colors ${
              armed
                ? danger
                  ? "bg-danger text-white cursor-pointer hover:bg-danger-hover"
                  : "bg-brand text-white cursor-pointer hover:bg-brand-hover"
                : "bg-border-4 text-fainter cursor-not-allowed"
            }`}
          >
            {pending ? "Working…" : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
