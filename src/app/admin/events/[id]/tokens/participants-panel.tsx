"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Pill } from "@/components/ui/pill";
import { initials } from "@/lib/ids";
import DeleteParticipantButton from "./delete-participant-button";
import TokenEmailCell from "./token-email-cell";
import { sendAllTokenEmailsAction, sendSelectedTokenEmailsAction } from "./actions";

type ParticipantRow = {
  id: string;
  name: string | null;
  jemaat: string | null;
  token: string;
  email: string | null;
  tokenSentAt: string | null;
  status: "Voted" | "Registered" | "Not sent";
};

export default function ParticipantsPanel({
  eventId,
  participants,
  emailReady,
  useCredentials,
}: {
  eventId: string;
  participants: ParticipantRow[];
  emailReady: boolean;
  useCredentials: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const withEmailCount = useMemo(() => participants.filter((p) => p.email).length, [participants]);
  const selectedCount = selected.size;
  const selectedWithEmailCount = useMemo(
    () => participants.filter((p) => selected.has(p.id) && p.email).length,
    [participants, selected]
  );

  const allSelected = participants.length > 0 && selectedCount === participants.length;
  const partiallySelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(participants.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sendCount = selectedCount > 0 ? selectedWithEmailCount : withEmailCount;
  const sendDisabled = !emailReady || sendCount === 0;
  const sendLabel =
    selectedCount > 0 ? `Kirim token ke ${selectedCount} dipilih (${selectedWithEmailCount})` : `Kirim token ke semua (${withEmailCount})`;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card border border-border-1 rounded-xl p-5">
        <div className="text-sm font-semibold text-ink mb-1">Kirim token via email</div>
        <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
          Kirim token pribadi ke email masing-masing peserta lewat Resend. Tambahkan alamat email di kolom
          <span className="font-medium"> Token email</span> pada tabel, atau lewat kolom{" "}
          <span className="font-mono">Email</span> pada berkas kredensial. Pilih satu, beberapa, atau semua peserta di
          tabel di bawah untuk mengirim hanya ke mereka — tanpa seleksi, tombol ini mengirim ke semua peserta yang
          memiliki email.
        </p>
        {emailReady ? (
          <div className="flex items-center gap-2.5">
            <button
              disabled={sendDisabled}
              onClick={() => {
                setNotice(null);
                setConfirmOpen(true);
              }}
              title={
                !emailReady
                  ? "Layanan email belum dikonfigurasi"
                  : sendCount === 0
                    ? "Tidak ada peserta dengan alamat email"
                    : undefined
              }
              className="text-[12.5px] font-medium text-white bg-brand rounded-lg px-3.5 py-2 cursor-pointer hover:bg-brand-hover disabled:opacity-50"
            >
              {sendLabel}
            </button>
            {selectedCount > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-[11.5px] text-faint hover:text-ink underline decoration-dotted"
              >
                Batalkan pilihan
              </button>
            )}
            {notice && (
              <span className={`text-[11.5px] ${notice.kind === "ok" ? "text-brand" : "text-danger"}`}>{notice.text}</span>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-amber-text bg-amber-bg border border-amber-border rounded-md px-3 py-2">
            Layanan email belum dikonfigurasi. Isi <span className="font-mono">RESEND_API_KEY</span> dan{" "}
            <span className="font-mono">RESEND_FROM_EMAIL</span> pada environment server untuk mengaktifkan pengiriman.
          </p>
        )}
      </div>

      <div className="bg-card border border-border-1 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4.5 py-3 border-b border-border-4 bg-paper-2">
          <span className="w-[18px] flex-none flex items-center">
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={participants.length === 0}
              className="cursor-pointer"
              aria-label="Pilih semua peserta"
            />
          </span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase flex-1 min-w-[130px]">Participant</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[100px]">Jemaat</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[95px]">Token</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[85px]">Status</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[240px]">Token email</span>
          <span className="w-[56px]" />
        </div>
        {participants.length === 0 && (
          <div className="p-5 text-sm text-faint">
            {useCredentials ? "No one has registered yet." : "No tokens generated yet."}
          </div>
        )}
        {participants.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4.5 py-2.5 border-b border-border-5 last:border-b-0">
            <span className="w-[18px] flex-none flex items-center">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleOne(p.id)}
                className="cursor-pointer"
                aria-label={`Pilih ${p.name ?? p.token}`}
              />
            </span>
            <span className="flex items-center gap-2.5 flex-1 min-w-[130px]">
              <span className="w-6.5 h-6.5 rounded-full bg-border-4 text-body text-[10px] font-semibold flex items-center justify-center flex-none">
                {p.name ? initials(p.name) : "—"}
              </span>
              <span className="text-[13px] text-ink font-medium truncate">
                {p.name ?? <span className="text-faint font-normal">Not registered</span>}
              </span>
            </span>
            <span className="text-xs text-body w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">{p.jemaat ?? "—"}</span>
            <span className="font-mono text-xs text-ink-soft w-[95px] truncate">{p.token}</span>
            <span className="w-[85px]">
              <Pill kind={p.status} />
            </span>
            <span className="w-[240px]">
              <TokenEmailCell
                eventId={eventId}
                participantId={p.id}
                email={p.email}
                tokenSentAt={p.tokenSentAt}
                emailReady={emailReady}
              />
            </span>
            <span className="w-[56px] flex justify-end">
              <DeleteParticipantButton eventId={eventId} participantId={p.id} />
            </span>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Kirim token via email"
        body={
          selectedCount > 0
            ? `Kirim email berisi token pribadi ke ${selectedWithEmailCount} dari ${selectedCount} peserta terpilih yang memiliki alamat email?`
            : `Kirim email berisi token pribadi ke ${withEmailCount} peserta yang memiliki alamat email?`
        }
        confirmLabel="Kirim sekarang"
        action={async () => {
          const res =
            selectedCount > 0
              ? await sendSelectedTokenEmailsAction(eventId, Array.from(selected))
              : await sendAllTokenEmailsAction(eventId);
          if (res.ok) {
            const queued = "queued" in res ? res.queued : 0;
            setNotice({
              kind: "ok",
              text: queued
                ? `${queued} email masuk antrean — dikirim di latar belakang.`
                : `${res.sent ?? 0} email terkirim.`,
            });
            setSelected(new Set());
            router.refresh();
            return { ok: true };
          }
          if ("sent" in res && typeof res.sent === "number" && res.sent > 0) {
            setNotice({ kind: "err", text: `${res.sent} terkirim, ${res.failed ?? 0} gagal.` });
            router.refresh();
          }
          return { ok: false, error: res.error };
        }}
      />
    </div>
  );
}
