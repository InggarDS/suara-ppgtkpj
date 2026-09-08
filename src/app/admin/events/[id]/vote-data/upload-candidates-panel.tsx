"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { parseCredentialsFile } from "@/lib/credentials-file";
import { namaJemaatKey } from "@/lib/normalize";
import {
  compareCandidateUploadAction,
  sendComparedAsCandidatesAction,
  type CompareResult,
} from "./actions";

type ParsedRow = { name: string; jemaat: string };

export default function UploadCandidatesPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [comparing, startCompare] = useTransition();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [stageId, setStageId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const duplicateCount = useMemo(() => {
    if (!parsed) return 0;
    const seen = new Set<string>();
    let dup = 0;
    for (const r of parsed) {
      const k = namaJemaatKey(r.name, r.jemaat);
      if (seen.has(k)) dup++;
      else seen.add(k);
    }
    return dup;
  }, [parsed]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(undefined);
    setResult(null);
    setNotice(null);
    setParsed(null);

    const okExt = /\.(xlsx?|csv)$/i.test(file.name);
    if (!okExt) {
      setError("Format tidak didukung. Gunakan file .xlsx atau .csv.");
      return;
    }
    setUploading(true);
    try {
      const rows = await parseCredentialsFile(file);
      if (!rows.length) {
        setError("File tidak berisi baris data yang valid.");
        return;
      }
      setParsed(rows);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File tidak dapat dibaca. Pastikan ada kolom \"Nama\" dan \"Jemaat\".");
    } finally {
      setUploading(false);
    }
  }

  function compare() {
    if (!parsed) return;
    setNotice(null);
    startCompare(async () => {
      const res = await compareCandidateUploadAction(eventId, parsed);
      if (res.ok) {
        setResult(res);
        setStageId(res.stages[0]?.id ?? "");
      } else {
        setError(res.error);
      }
    });
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    setResult(null);
    setError(undefined);
    setNotice(null);
  }

  const matchedKeys = result ? result.rows.filter((r) => r.status === "cocok").map((r) => r.key) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm font-semibold text-ink">Upload Data Kandidat</div>
        <span className="text-[11.5px] text-faint">
          File .xlsx / .csv dengan kolom <span className="font-mono">Nama</span> dan <span className="font-mono">Jemaat</span>
        </span>
        <span className="flex-1" />
        {(parsed || result) && (
          <button onClick={reset} className="text-[11.5px] text-faint hover:text-ink underline decoration-dotted">
            Reset
          </button>
        )}
      </div>

      <div className="bg-card border border-border-1 rounded-xl p-5 flex flex-col gap-4">
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[rgba(27,77,228,.12)] self-start">
          <input
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={onFile}
          />
          {uploading && <Spinner className="w-3.5 h-3.5 text-brand" />}
          {uploading ? "Membaca file…" : parsed ? "Pilih file lain" : "Pilih file (.xlsx / .csv)"}
        </label>

        {error && (
          <p className="text-[12px] text-danger bg-danger-bg border border-danger-border rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* preview */}
        {parsed && !result && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 flex-wrap text-[12px]">
              <span className="text-ink font-medium">{fileName}</span>
              <span className="text-faint">{parsed.length} baris terbaca</span>
              {duplicateCount > 0 && (
                <span className="text-amber-text bg-amber-bg border border-amber-border rounded px-2 py-0.5">
                  {duplicateCount} baris duplikat terdeteksi
                </span>
              )}
            </div>
            <div className="border border-border-4 rounded-lg overflow-hidden max-h-[240px] overflow-y-auto">
              <div className="flex items-center gap-3 px-3.5 py-2 border-b border-border-4 bg-paper-2">
                <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase flex-1">Nama</span>
                <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[180px]">Jemaat</span>
              </div>
              {parsed.slice(0, 50).map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-1.5 border-b border-border-5 last:border-b-0">
                  <span className="flex-1 text-[12.5px] text-ink truncate">{r.name}</span>
                  <span className="w-[180px] text-xs text-body truncate">{r.jemaat || "—"}</span>
                </div>
              ))}
              {parsed.length > 50 && (
                <div className="px-3.5 py-1.5 text-[11px] text-faint">+ {parsed.length - 50} baris lainnya…</div>
              )}
            </div>
            <button
              onClick={compare}
              disabled={comparing}
              className="self-start text-[12.5px] font-semibold btn-gradient rounded-full px-4 py-2 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {comparing && <Spinner className="w-3.5 h-3.5" />}
              {comparing ? "Membandingkan…" : "Bandingkan dengan Data Kredensial"}
            </button>
          </div>
        )}

        {/* comparison result */}
        {result && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="Total Data" value={result.total} />
              <Stat label="Data Cocok" value={result.matched} tone="ok" />
              <Stat label="Tidak Cocok" value={result.unmatched} tone="err" />
              <Stat label="Duplicate" value={result.duplicates} tone="warn" />
            </div>

            <div className="border border-border-4 rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
              <div className="flex items-center gap-3 px-3.5 py-2 border-b border-border-4 bg-paper-2 sticky top-0">
                <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase flex-1">Nama</span>
                <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[140px]">Jemaat</span>
                <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[120px]">Status</span>
                <span className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase w-[200px]">Data Kredensial</span>
              </div>
              {result.rows.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3.5 py-1.5 border-b border-border-5 last:border-b-0 ${
                    r.status === "tidak-cocok" ? "bg-danger-bg" : r.status === "duplicate" ? "bg-amber-bg" : ""
                  }`}
                >
                  <span className="flex-1 text-[12.5px] text-ink truncate">{r.name}</span>
                  <span className="w-[140px] text-xs text-body truncate">{r.jemaat || "—"}</span>
                  <span className="w-[120px]">
                    {r.status === "cocok" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand">✓ Cocok</span>
                    )}
                    {r.status === "tidak-cocok" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">✕ Tidak Cocok</span>
                    )}
                    {r.status === "duplicate" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-text">Duplicate</span>
                    )}
                  </span>
                  <span className="w-[200px] text-xs text-body truncate">
                    {r.match ? `${r.match.name} - ${r.match.jemaat}${r.match.token ? ` · ${r.match.token}` : ""}` : "-"}
                  </span>
                </div>
              ))}
            </div>

            {notice && (
              <p className={`text-[12px] ${notice.kind === "ok" ? "text-brand" : "text-danger"}`}>{notice.text}</p>
            )}

            {result.matched === 0 ? (
              <p className="text-[12px] text-faint">Tidak ada data yang cocok dengan kredensial — tidak ada yang dapat dikirim sebagai kandidat.</p>
            ) : result.stages.length === 0 ? (
              <p className="text-[12px] text-amber-text bg-amber-bg border border-amber-border rounded-md px-3 py-2">
                Tidak ada stage berstatus &quot;Not started&quot; untuk menerima kandidat.
              </p>
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap">
                {result.stages.length > 1 && (
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="text-[12px] border border-border-1 rounded-md px-2 py-1.5 bg-card text-ink outline-none focus:border-brand"
                  >
                    {result.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        Stage {s.order}: {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!stageId}
                  className="text-[12.5px] font-semibold btn-gradient rounded-full px-4 py-2 disabled:opacity-50"
                >
                  Kirim {result.matched} Kandidat Cocok
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Kirim data cocok sebagai kandidat"
        body={
          <>
            Ditemukan <strong>{result?.matched ?? 0}</strong> data yang sesuai dengan kredensial. Hanya data yang cocok
            yang akan digunakan sebagai kandidat. Lanjutkan?
          </>
        }
        confirmLabel="Konfirmasi & Kirim Kandidat"
        action={async () => {
          const res = await sendComparedAsCandidatesAction(eventId, matchedKeys, stageId);
          if (res.ok) {
            setNotice({
              kind: "ok",
              text: `${res.added} kandidat ditambahkan dari data kredensial${res.skipped ? ` · ${res.skipped} dilewati (sudah menjadi kandidat)` : ""}.`,
            });
            router.refresh();
          }
          return res;
        }}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "err" | "warn" }) {
  const color =
    tone === "ok" ? "text-brand" : tone === "err" ? "text-danger" : tone === "warn" ? "text-amber-text" : "text-ink";
  return (
    <div className="bg-paper-2 border border-border-3 rounded-lg py-2.5">
      <div className={`text-[20px] font-semibold ${color}`}>{value}</div>
      <div className="text-[10.5px] text-faint uppercase tracking-[.06em]">{label}</div>
    </div>
  );
}
