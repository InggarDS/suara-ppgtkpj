"use client";

import { useMemo, useState } from "react";

export type StatusRow = {
  id: string;
  name: string | null;
  jemaat: string | null;
  token: string;
  registered: boolean;
  checkedIn: boolean;
  voted: boolean;
};

type Filter = "all" | "no-reg" | "no-checkin" | "no-vote";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "no-reg", label: "Belum registrasi ulang" },
  { key: "no-checkin", label: "Belum check-in" },
  { key: "no-vote", label: "Belum voting" },
];

function matches(row: StatusRow, filter: Filter): boolean {
  switch (filter) {
    case "no-reg":
      return !row.registered;
    case "no-checkin":
      return row.registered && !row.checkedIn;
    case "no-vote":
      return row.registered && !row.voted;
    default:
      return true;
  }
}

export default function StatusView({
  rows,
  liveStage,
  totalParticipants,
  registeredCount,
}: {
  rows: StatusRow[];
  liveStage: { name: string; order: number; phase: string } | null;
  totalParticipants: number;
  registeredCount: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: rows.length,
      "no-reg": rows.filter((r) => matches(r, "no-reg")).length,
      "no-checkin": rows.filter((r) => matches(r, "no-checkin")).length,
      "no-vote": rows.filter((r) => matches(r, "no-vote")).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matches(r, filter)) return false;
      if (!q) return true;
      return (
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.jemaat ?? "").toLowerCase().includes(q) ||
        r.token.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* summary */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[12.5px] text-body">
          <strong className="text-ink">{registeredCount}</strong> / {totalParticipants} sudah registrasi ulang
        </span>
        <span className="flex-1" />
        {liveStage ? (
          <span className="text-[11.5px] font-medium text-brand bg-brand-soft rounded-full px-2.5 py-1">
            Live: Stage {liveStage.order} · {liveStage.name} ({liveStage.phase === "VOTING" ? "voting" : "check-in"})
          </span>
        ) : (
          <span className="text-[11.5px] font-medium text-faint bg-border-5 rounded-full px-2.5 py-1">
            Tidak ada stage berjalan — kolom check-in / vote kosong
          </span>
        )}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[12px] font-medium rounded-full px-3 py-1.5 border transition-colors ${
              filter === f.key
                ? "border-brand text-brand bg-brand-soft"
                : "border-border-1 text-ink-mute bg-card hover:border-brand"
            }`}
          >
            {f.label}
            <span className={`ml-1.5 ${filter === f.key ? "text-brand" : "text-faint"}`}>{counts[f.key]}</span>
          </button>
        ))}
        <span className="flex-1" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama / jemaat / token…"
          className="text-[12.5px] border border-border-1 rounded-lg px-3 py-1.5 bg-card text-ink outline-none focus:border-brand w-[240px] max-w-full"
        />
      </div>

      {/* table */}
      <div className="border border-border-1 rounded-xl overflow-hidden bg-card">
        <div className="grid grid-cols-[1fr_140px_120px_72px_72px_72px] gap-2 px-4 py-2.5 border-b border-border-3 bg-paper-2">
          {["Nama", "Jemaat", "Token", "Reg", "Check-in", "Vote"].map((h) => (
            <span key={h} className="font-mono text-[10px] tracking-[.08em] text-fainter uppercase">
              {h}
            </span>
          ))}
        </div>
        <div className="max-h-[calc(100dvh-360px)] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-faint">Tidak ada peserta pada filter ini.</div>
          ) : (
            visible.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_140px_120px_72px_72px_72px] gap-2 px-4 py-2 border-b border-border-5 last:border-b-0 items-center"
              >
                <span className="text-[12.5px] text-ink truncate">{r.name ?? <span className="text-faint">— belum isi —</span>}</span>
                <span className="text-[12px] text-body truncate">{r.jemaat || "—"}</span>
                <span className="font-mono text-[11px] text-faint truncate">{r.token}</span>
                <Cell on={r.registered} />
                <Cell on={r.checkedIn} muted={!liveStage} />
                <Cell on={r.voted} muted={!liveStage} />
              </div>
            ))
          )}
        </div>
      </div>
      <p className="text-[11px] text-faint">
        {visible.length} baris ditampilkan. Halaman ini menyegar otomatis saat ada registrasi, check-in, atau suara masuk.
      </p>
    </div>
  );
}

function Cell({ on, muted = false }: { on: boolean; muted?: boolean }) {
  if (muted) return <span className="text-faint text-[13px]">·</span>;
  return on ? (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-soft text-brand text-[12px] font-bold">✓</span>
  ) : (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger-bg text-danger text-[12px] font-bold">✕</span>
  );
}
