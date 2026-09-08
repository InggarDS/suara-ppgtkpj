"use client";

import { useState } from "react";
import type { ResultRow } from "@/lib/results";

const SilhouetteAvatar = ({ size, dark }: { size: number; dark: boolean }) => (
  <span
    className={`rounded-full flex-none flex items-center justify-center ${dark ? "bg-stage-dark-3 text-stage-dimmer" : "bg-border-4 text-faint"}`}
    style={{ width: size, height: size }}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c1-3.5 4-5 6.5-5s5.5 1.5 6.5 5" strokeLinecap="round" />
    </svg>
  </span>
);

function Avatar({ row, dark }: { row: ResultRow; dark: boolean }) {
  const [hover, setHover] = useState(false);
  if (!row.photo) {
    return row.initials ? (
      <span
        className={`w-9 h-9 rounded-full flex-none flex items-center justify-center text-[11px] font-semibold ${dark ? "bg-stage-dark-3 text-stage-dim" : "bg-border-4 text-faint"}`}
      >
        {row.initials}
      </span>
    ) : (
      <SilhouetteAvatar size={36} dark={dark} />
    );
  }
  return (
    <span
      className="relative flex-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
      {hover && (
        <span className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 z-30 pointer-events-none">
          <span className={`block rounded-2xl p-1.5 shadow-xl ${dark ? "bg-stage-dark-2" : "bg-paper border border-border-1"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.photo} alt="" className="w-40 h-40 rounded-xl object-cover" />
          </span>
        </span>
      )}
    </span>
  );
}

export function VotingTable({
  rows,
  masked,
  tone = "light",
  maxBar,
}: {
  rows: ResultRow[];
  masked?: boolean;
  tone?: "dark" | "light";
  maxBar?: number;
}) {
  const dark = tone === "dark";
  const top = maxBar ?? Math.max(1, ...rows.map((r) => r.votes));

  const head = dark ? "text-stage-dimmer" : "text-faint";
  const name = dark ? "text-white" : "text-ink";
  const sub = dark ? "text-stage-dim" : "text-body";
  const rowBorder = dark ? "border-stage-dark-3" : "border-border-5";

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className={`font-mono text-[10px] tracking-[.1em] uppercase ${head}`}>
            <th className="w-8 py-2 font-normal">#</th>
            <th className="py-2 font-normal">Nama</th>
            <th className="py-2 font-normal">Jemaat</th>
            <th className="py-2 font-normal text-right w-[160px]">Jumlah Voting</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`border-t ${rowBorder} ${i === 0 && !masked ? (dark ? "bg-white/[.04]" : "bg-brand-soft/60") : ""}`}>
              <td className={`py-2.5 font-mono text-[12px] ${head}`}>{i + 1}</td>
              <td className="py-2.5">
                <span className="flex items-center gap-2.5">
                  <Avatar row={r} dark={dark} />
                  <span
                    className={`text-[14px] font-semibold ${masked ? `font-mono tracking-[.02em] ${sub}` : name}`}
                  >
                    {r.name}
                  </span>
                </span>
              </td>
              <td className={`py-2.5 text-[13px] ${sub}`}>{masked ? "**" : r.jemaat || "—"}</td>
              <td className="py-2.5">
                <span className="flex items-center justify-end gap-2.5">
                  <span className={`flex-1 max-w-[90px] h-1.5 rounded overflow-hidden ${dark ? "bg-stage-dark-2" : "bg-border-4"}`}>
                    <span
                      className="block h-full rounded transition-all duration-500"
                      style={{
                        width: `${(r.votes / top) * 100}%`,
                        background: i === 0 ? "linear-gradient(90deg,#3d6df0,#1b4de4)" : dark ? "#1a3372" : "#9db0e6",
                      }}
                    />
                  </span>
                  <span className={`font-mono text-[14px] font-semibold tabular-nums w-9 text-right ${name}`}>{r.votes}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
