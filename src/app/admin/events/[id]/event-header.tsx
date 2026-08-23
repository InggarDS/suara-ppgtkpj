"use client";

import { useTransition } from "react";
import { Toggle } from "@/components/ui/toggle";
import { toggleEventStatusAction } from "../../actions";

export default function EventHeader({
  eventId,
  title,
  subtitle,
  status,
}: {
  eventId: string;
  title: string;
  subtitle: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const active = status === "ACTIVE";

  return (
    <header className="px-8 pt-6.5 pb-4.5 border-b border-border-4 flex items-start gap-5">
      <div className="flex-1 min-w-0">
        <h1 className="m-0 mb-1.5 text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        <p className="m-0 text-[13px] leading-relaxed text-body max-w-[56ch]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2.5 flex-none">
        <div className="flex items-center gap-2 bg-paper-2 border border-border-1 rounded-[16px] px-2.5 py-1.5">
          <span className="text-xs text-body">Event access</span>
          <Toggle on={active} disabled={pending} onToggle={() => startTransition(() => { void toggleEventStatusAction(eventId); })} />
          <span className={`text-xs font-semibold w-11 ${active ? "text-brand" : "text-faint"}`}>
            {active ? "Open" : "Closed"}
          </span>
        </div>
      </div>
    </header>
  );
}
