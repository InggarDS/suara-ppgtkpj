"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { initials } from "@/lib/ids";
import { Spinner } from "@/components/ui/spinner";
import { LinkPending } from "@/components/ui/link-pending";

type EventLite = { id: string; name: string; publicId: string; status: string };

const NAV = [
  { key: "", label: "Overview", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
  { key: "flow", label: "Voting flow", icon: "M5 4v6a3 3 0 0 0 3 3h8M16 9l4 4-4 4" },
  { key: "monitor", label: "Live monitoring", icon: "M4 20V11M10 20V4M16 20v-6M2 20h20" },
  { key: "status", label: "Status Peserta", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" },
  { key: "results", label: "Shared screen", icon: "M3 4.5h18v12H3zM9 20.5h6" },
  { key: "tokens", label: "Access & tokens", icon: "M14 8a5 5 0 1 0-4.6 5H11v3h3v-3h1.2A5 5 0 0 0 14 8Z" },
  { key: "vote-data", label: "Management Data Vote", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" },
  { key: "data", label: "Data & cleanup", icon: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" },
];

export default function Sidebar({
  currentEventId,
  currentEventName,
  currentEventStatus,
  currentEventPublicId,
  events,
  hasLiveStage,
  adminName,
}: {
  currentEventId: string;
  currentEventName: string;
  currentEventStatus: string;
  currentEventPublicId: string;
  events: EventLite[];
  hasLiveStage: boolean;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, startSwitch] = useTransition();

  const section = pathname.split(`/admin/events/${currentEventId}`)[1]?.replace(/^\//, "") || "";
  const activeKey = NAV.find((n) => n.key === section)?.key ?? "";

  return (
    <aside className="w-[236px] flex-none border-r border-border-3 px-3.5 py-5 bg-paper-2 flex flex-col gap-5.5 overflow-y-auto">
      <div className="relative">
        <div className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase mb-2 ml-2">Current event</div>
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="w-full text-left bg-card border border-border-1 rounded-[18px] px-3 py-2.5 cursor-pointer flex items-center gap-2.5"
        >
          <span
            className={`w-2 h-2 rounded-full flex-none ${
              currentEventStatus === "ACTIVE" ? "bg-brand-accent" : "bg-hairline"
            }`}
          />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
              {currentEventName}
            </span>
            <span className="block font-mono text-[10.5px] leading-relaxed text-faint">{currentEventPublicId}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8D97C2" strokeWidth="2" strokeLinecap="round">
            <path d="m7 9 5 5 5-5"></path>
          </svg>
        </button>
        {switcherOpen && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border-1 rounded-[18px] shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
            {events.map((ev) => (
              <button
                key={ev.id}
                disabled={switching}
                onClick={() => {
                  setSwitcherOpen(false);
                  startSwitch(() => {
                    router.push(`/admin/events/${ev.id}${section ? `/${section}` : ""}`);
                  });
                }}
                className={`w-full text-left px-3 py-2.5 text-[12.5px] cursor-pointer hover:bg-border-5 flex items-center gap-2 disabled:opacity-60 ${
                  ev.id === currentEventId ? "text-brand font-medium" : "text-ink-soft"
                }`}
              >
                {switching && <Spinner className="w-3 h-3 flex-none" />}
                <span className="min-w-0 truncate">{ev.name}</span>
              </button>
            ))}
            <Link
              href="/admin/events"
              onClick={() => setSwitcherOpen(false)}
              className="block px-3 py-2.5 text-[12.5px] text-body border-t border-border-4 hover:bg-border-5"
            >
              All events
            </Link>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        <div className="font-mono text-[10px] tracking-[.09em] text-fainter uppercase mb-2 ml-2">Workspace</div>
        {NAV.map((item) => {
          const active = item.key === activeKey;
          const badge = item.key === "monitor" && hasLiveStage;
          return (
            <Link
              key={item.key}
              href={`/admin/events/${currentEventId}${item.key ? `/${item.key}` : ""}`}
              className={`flex items-center gap-2.5 w-full rounded-[16px] px-2.5 py-2.5 text-[13px] font-medium transition-colors ${
                active ? "bg-brand-soft text-brand" : "text-ink-mute hover:bg-card"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none opacity-85">
                <path d={item.icon}></path>
              </svg>
              <span className="flex-1 text-left">{item.label}</span>
              <LinkPending className="w-3.5 h-3.5 flex-none" />
              {badge && (
                <span className="font-mono text-[10px] bg-brand-soft text-brand rounded px-[5px] py-[3px]">LIVE</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border-3 pt-3.5 flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full bg-border-2 text-ink-mute text-[11px] font-semibold flex items-center justify-center">
          {initials(adminName)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-medium text-ink">{adminName}</span>
          <span className="block text-[11px] text-faint">Administrator</span>
        </span>
      </div>
    </aside>
  );
}
