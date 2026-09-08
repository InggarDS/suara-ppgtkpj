"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { compressImage } from "@/lib/compress-image";
import {
  deleteVoteDataParticipantsAction,
  sendParticipantsAsCandidatesAction,
  setParticipantsValidatedAction,
  uploadParticipantPhotoAction,
} from "./actions";

export type VoteRow = {
  id: string;
  name: string | null;
  jemaat: string | null;
  token: string;
  photo: string | null;
  validated: boolean;
  registered: boolean;
  isCandidate: boolean;
};

type StageOpt = { id: string; name: string; order: number };

export default function VoteDataView({
  eventId,
  rows,
  editableStages,
}: {
  eventId: string;
  rows: VoteRow[];
  editableStages: StageOpt[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stageId, setStageId] = useState(editableStages[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<null | "delete" | "candidate">(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.jemaat ?? "").toLowerCase().includes(q) ||
        r.token.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const filteredIds = filtered.map((r) => r.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected = filteredIds.some((id) => selected.has(id));

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedValid = selectedRows.filter((r) => r.validated);
  const canSendCandidates = selectedValid.length > 0 && Boolean(stageId);

  function toggleRow(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, onOk: (msg?: string) => void) {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        onOk();
        router.refresh();
      } else {
        setNotice({ kind: "err", text: res.error ?? "Terjadi kesalahan." });
      }
    });
  }

  function setValidated(ids: string[], validated: boolean) {
    if (!ids.length) return;
    run(
      () => setParticipantsValidatedAction(eventId, ids, validated),
      () => setNotice({ kind: "ok", text: validated ? `${ids.length} data ditandai valid.` : `${ids.length} data batal divalidasi.` })
    );
  }

  function openPhotoPicker(participantId: string) {
    photoTargetRef.current = participantId;
    fileInputRef.current?.click();
  }

  async function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const participantId = photoTargetRef.current;
    e.target.value = "";
    photoTargetRef.current = null;
    if (!file || !participantId) return;
    setNotice(null);
    setUploadingId(participantId);
    try {
      const compressed = await compressImage(file);
      const res = await uploadParticipantPhotoAction(eventId, participantId, compressed);
      if (res.ok) {
        setNotice({ kind: "ok", text: "Foto berhasil diunggah." });
        router.refresh();
      } else {
        setNotice({ kind: "err", text: res.error ?? "Gagal mengunggah foto." });
      }
    } catch {
      setNotice({ kind: "err", text: "Gagal memproses gambar." });
    } finally {
      setUploadingId(null);
    }
  }

  const totalChecked = rows.filter((r) => r.validated).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm font-semibold text-ink">Data Peserta</div>
        <span className="text-[11.5px] text-faint">
          {rows.length} peserta · {totalChecked} tervalidasi
        </span>
        <span className="flex-1" />
        <div className="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, jemaat, atau token…"
            className="w-[280px] border border-border-1 rounded-lg pl-8 pr-3 py-2 text-[13px] text-ink bg-card outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* selection / bulk actions */}
      <div className="flex items-center gap-2 flex-wrap bg-card border border-border-1 rounded-lg px-3 py-2.5">
        <span className="text-[12px] text-body">
          {selected.size > 0 ? `${selected.size} dipilih` : "Pilih baris untuk aksi massal"}
        </span>
        {selected.size > 0 && (
          <button
            onClick={clearSelection}
            className="text-[11.5px] text-faint hover:text-ink underline decoration-dotted"
          >
            Bersihkan
          </button>
        )}
        <span className="flex-1" />
        <button
          disabled={pending || selected.size === 0}
          onClick={() => setValidated([...selected], true)}
          className="text-[12px] font-medium text-brand bg-brand-soft rounded-md px-2.5 py-1.5 disabled:opacity-50 hover:bg-[rgba(27,77,228,.18)]"
        >
          Tandai Valid
        </button>
        <button
          disabled={pending || selected.size === 0}
          onClick={() => setValidated([...selected], false)}
          className="text-[12px] font-medium text-body bg-border-5 border border-border-1 rounded-md px-2.5 py-1.5 disabled:opacity-50"
        >
          Batal Valid
        </button>
        <button
          disabled={pending || selected.size === 0}
          onClick={() => setConfirm("delete")}
          className="text-[12px] font-medium text-danger bg-card border border-danger-border rounded-md px-2.5 py-1.5 disabled:opacity-50 hover:bg-danger-bg-hover"
        >
          Hapus
        </button>

        <span className="w-px h-5 bg-border-2 mx-1" />

        {editableStages.length > 1 && (
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="text-[12px] border border-border-1 rounded-md px-2 py-1.5 bg-card text-ink outline-none focus:border-brand"
          >
            {editableStages.map((s) => (
              <option key={s.id} value={s.id}>
                Stage {s.order}: {s.name}
              </option>
            ))}
          </select>
        )}
        <button
          disabled={pending || !canSendCandidates}
          onClick={() => setConfirm("candidate")}
          className="text-[12px] font-semibold btn-gradient rounded-full px-3.5 py-1.5 disabled:opacity-50"
          title={
            editableStages.length === 0
              ? "Tidak ada stage yang dapat menerima kandidat"
              : selectedValid.length === 0
                ? "Pilih data yang sudah tervalidasi"
                : undefined
          }
        >
          Kirim sebagai Kandidat ({selectedValid.length})
        </button>
      </div>

      {editableStages.length === 0 && (
        <p className="text-[11.5px] text-amber-text bg-amber-bg border border-amber-border rounded-md px-3 py-2">
          Tidak ada stage berstatus &quot;Not started&quot; — kandidat terkunci setelah stage dimulai.
        </p>
      )}

      {selected.size > 0 && selectedValid.length < selected.size && (
        <p className="text-[11.5px] text-faint">
          {selected.size - selectedValid.length} data yang dipilih belum tervalidasi dan tidak akan dikirim sebagai kandidat.
        </p>
      )}

      {notice && (
        <p className={`text-[12px] ${notice.kind === "ok" ? "text-brand" : "text-danger"}`}>{notice.text}</p>
      )}

      {/* table */}
      <div className="bg-card border border-border-1 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3.5 px-4 py-2.5 border-b border-border-4 bg-paper-2">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
            }}
            onChange={toggleAll}
            className="w-3.5 h-3.5 accent-[var(--color-brand)] cursor-pointer flex-none"
            aria-label="Pilih semua"
          />
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase flex-1">Nama</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[64px]">Photo</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[130px]">Jemaat</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[110px]">Token</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[130px]">Status Check</span>
          <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[90px] text-right">Action</span>
        </div>

        {rows.length === 0 && (
          <div className="p-6 text-sm text-faint text-center">
            Belum ada peserta. Data akan muncul otomatis setelah peserta melakukan pendaftaran.
          </div>
        )}
        {rows.length > 0 && filtered.length === 0 && (
          <div className="p-6 text-sm text-faint text-center">
            Tidak ada hasil untuk &quot;{query}&quot;.
          </div>
        )}

        {filtered.map((r) => (
          <div
            key={r.id}
            className={`flex items-center gap-3.5 px-4 py-2.5 border-b border-border-5 last:border-b-0 ${
              selected.has(r.id) ? "bg-brand-soft" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => toggleRow(r.id)}
              className="w-3.5 h-3.5 accent-[var(--color-brand)] cursor-pointer flex-none"
              aria-label={`Pilih ${r.name ?? r.token}`}
            />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] text-ink font-medium truncate">
                {r.name ?? <span className="text-faint font-normal">Belum terdaftar</span>}
              </span>
              {r.isCandidate && (
                <span className="font-mono text-[9px] tracking-[.06em] uppercase text-brand bg-brand-soft rounded px-1 py-0.5">
                  Kandidat
                </span>
              )}
            </span>

            <span className="w-[64px] flex-none">
              {r.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photo}
                  alt={r.name ?? ""}
                  className="w-10 h-10 rounded-lg object-cover border border-border-2"
                />
              ) : uploadingId === r.id ? (
                <span className="w-10 h-10 rounded-lg bg-border-5 border border-border-2 flex items-center justify-center">
                  <Spinner className="w-4 h-4 text-brand" />
                </span>
              ) : (
                <button
                  onClick={() => openPhotoPicker(r.id)}
                  disabled={pending}
                  title="Upload Photo"
                  className="w-10 h-10 rounded-lg bg-border-5 border border-dashed border-border-2 flex items-center justify-center text-faint hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </span>

            <span className="text-xs text-body w-[130px] truncate">{r.jemaat ?? "—"}</span>
            <span className="font-mono text-xs text-ink-soft w-[110px] truncate">{r.token}</span>

            <span className="w-[130px]">
              {r.validated ? (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand bg-brand-soft rounded-md px-2 py-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                  Checked / Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-faint bg-border-5 rounded-md px-2 py-1">
                  Not Checked
                </span>
              )}
            </span>

            <span className="w-[90px] flex justify-end items-center gap-1.5">
              {r.photo && (
                <button
                  onClick={() => openPhotoPicker(r.id)}
                  disabled={pending || uploadingId === r.id}
                  title="Ganti foto"
                  className="text-[11px] text-faint hover:text-brand disabled:opacity-50"
                >
                  Foto
                </button>
              )}
              <RowDelete
                disabled={pending}
                onConfirm={() =>
                  run(
                    () => deleteVoteDataParticipantsAction(eventId, [r.id]),
                    () => {
                      setSelected((cur) => {
                        const n = new Set(cur);
                        n.delete(r.id);
                        return n;
                      });
                      setNotice({ kind: "ok", text: "Data berhasil dihapus." });
                    }
                  )
                }
              />
            </span>
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPhotoFile}
      />

      <ConfirmModal
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title="Hapus data"
        body={
          <>
            Apakah Anda yakin ingin menghapus data ini?
            <span className="block mt-1 text-faint">{selected.size} baris akan dihapus.</span>
          </>
        }
        confirmLabel="Hapus"
        danger
        action={async () => {
          const res = await deleteVoteDataParticipantsAction(eventId, [...selected]);
          if (res.ok) {
            clearSelection();
            setNotice({ kind: "ok", text: `${res.count} data berhasil dihapus.` });
            router.refresh();
          }
          return res;
        }}
      />

      <ConfirmModal
        open={confirm === "candidate"}
        onClose={() => setConfirm(null)}
        title="Kirim sebagai kandidat"
        body={`Apakah Anda yakin ingin mengirim ${selectedValid.length} data yang dipilih sebagai kandidat?`}
        confirmLabel="Konfirmasi & Kirim Kandidat"
        action={async () => {
          const res = await sendParticipantsAsCandidatesAction(
            eventId,
            selectedValid.map((r) => r.id),
            stageId
          );
          if (res.ok) {
            clearSelection();
            setNotice({
              kind: "ok",
              text: `${res.added} kandidat ditambahkan${res.skipped ? ` · ${res.skipped} dilewati (sudah menjadi kandidat)` : ""}.`,
            });
            router.refresh();
          }
          return res;
        }}
      />
    </div>
  );
}

function RowDelete({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <button
        disabled={disabled}
        onClick={() => {
          onConfirm();
          setArmed(false);
        }}
        onBlur={() => setArmed(false)}
        autoFocus
        className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-danger rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50"
      >
        Yakin?
      </button>
    );
  }
  return (
    <button
      disabled={disabled}
      onClick={() => setArmed(true)}
      className="text-[11px] text-faint hover:text-danger cursor-pointer px-1.5 py-1.5 disabled:opacity-50"
    >
      Hapus
    </button>
  );
}
