"use client";

import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { relativeTime } from "@/lib/format";
import { sendTokenEmailAction, updateParticipantEmailAction } from "./actions";

export default function TokenEmailCell({
  eventId,
  participantId,
  email,
  tokenSentAt,
  mailjetReady,
}: {
  eventId: string;
  participantId: string;
  email: string | null;
  tokenSentAt: string | null;
  mailjetReady: boolean;
}) {
  const [value, setValue] = useState(email ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, startSave] = useTransition();
  const [sending, startSend] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const savedEmail = email ?? "";
  const dirty = value.trim() !== savedEmail;

  function save() {
    setError(undefined);
    startSave(async () => {
      const res = await updateParticipantEmailAction(eventId, participantId, value.trim());
      if (res.ok) setEditing(false);
      else setError(res.error);
    });
  }

  function send() {
    setError(undefined);
    startSend(async () => {
      const res = await sendTokenEmailAction(eventId, participantId);
      if (!res.ok) setError(res.error);
    });
  }

  if (editing || !savedEmail) {
    return (
      <span className="flex flex-col gap-1 w-full">
        <span className="flex items-center gap-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="email@contoh.com"
            className="flex-1 min-w-0 border border-border-1 rounded-md px-2 py-1 text-[11.5px] text-ink bg-card outline-none focus:border-brand"
          />
          <button
            disabled={saving || (!dirty && Boolean(savedEmail))}
            onClick={save}
            className="text-[11px] font-medium text-brand bg-brand-soft rounded-md px-2 py-1 disabled:opacity-50"
          >
            {saving ? <Spinner className="w-3 h-3" /> : "Simpan"}
          </button>
          {editing && (
            <button
              onClick={() => {
                setValue(savedEmail);
                setEditing(false);
                setError(undefined);
              }}
              className="text-[11px] text-faint px-1"
            >
              Batal
            </button>
          )}
        </span>
        {error && <span className="text-[10.5px] text-danger">{error}</span>}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1 w-full">
      <span className="flex items-center gap-1.5">
        <span className="flex-1 min-w-0 text-[11.5px] text-ink-soft truncate" title={savedEmail}>
          {savedEmail}
        </span>
        <button onClick={() => setEditing(true)} className="text-[10.5px] text-faint hover:text-ink px-1">
          Ubah
        </button>
      </span>
      <span className="flex items-center gap-2">
        <button
          disabled={sending || !mailjetReady}
          onClick={send}
          title={mailjetReady ? undefined : "Mailjet belum dikonfigurasi"}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-brand rounded-md px-2.5 py-1 cursor-pointer disabled:opacity-50 hover:bg-brand-hover"
        >
          {sending && <Spinner className="w-3 h-3" />}
          {sending ? "Mengirim…" : tokenSentAt ? "Kirim ulang" : "Kirim token"}
        </button>
        {tokenSentAt && (
          <span className="text-[10.5px] text-brand" title={new Date(tokenSentAt).toLocaleString()}>
            ✓ Terkirim {relativeTime(new Date(tokenSentAt))}
          </span>
        )}
      </span>
      {error && <span className="text-[10.5px] text-danger">{error}</span>}
    </span>
  );
}
