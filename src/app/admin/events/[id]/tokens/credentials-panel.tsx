"use client";

import { useState, useTransition } from "react";
import { parseCredentialsCsv } from "@/lib/csv";
import { addCredentialsAction, deleteCredentialAction } from "./actions";
import { Pill } from "@/components/ui/pill";

type Credential = { id: string; name: string; jemaat: string; registered: boolean };

export default function CredentialsPanel({ eventId, credentials }: { eventId: string; credentials: Credential[] }) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const registeredCount = credentials.filter((c) => c.registered).length;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCredentialsCsv(text);
      setError(undefined);
      startTransition(() => { void addCredentialsAction(eventId, rows); });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="bg-card border border-border-1 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-sm font-semibold text-ink flex-1">Credentials</div>
        <span className="text-xs text-faint">{registeredCount} / {credentials.length} registered</span>
      </div>
      <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
        Participants register with their name, matched against this list. Jemaat is filled in automatically from a match.
      </p>
      <label className="inline-flex items-center text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[#EAE7E0]">
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        {pending ? "Uploading…" : "Upload more (CSV: Nama, Jemaat)"}
      </label>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}

      {credentials.length > 0 && (
        <div className="mt-4 border border-border-4 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
          {credentials.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3.5 py-2 border-b border-border-5 last:border-b-0">
              <span className="flex-1 text-[12.5px] text-ink font-medium">{c.name}</span>
              <span className="text-xs text-body w-[130px] overflow-hidden text-ellipsis whitespace-nowrap">{c.jemaat}</span>
              <Pill kind={c.registered ? "Registered" : "Not sent"} />
              <DeleteCredentialButton eventId={eventId} credentialId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteCredentialButton({ eventId, credentialId }: { eventId: string; credentialId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (armed) {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => { void deleteCredentialAction(eventId, credentialId); })}
        onBlur={() => setArmed(false)}
        autoFocus
        className="text-[11px] font-medium text-white bg-danger rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50"
      >
        {pending ? "…" : "Confirm?"}
      </button>
    );
  }

  return (
    <button onClick={() => setArmed(true)} className="text-[11px] text-faint hover:text-danger cursor-pointer px-2 py-1.5">
      Delete
    </button>
  );
}
