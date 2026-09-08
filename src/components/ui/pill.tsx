const MAP: Record<string, string> = {
  ACTIVE: "pill-gradient",
  INACTIVE: "bg-border-5 text-faint",
  ARCHIVED: "bg-border-5 text-faint",
  Voted: "pill-gradient",
  Registered: "bg-border-6 text-body",
  "Not sent": "bg-amber-chip text-amber-text",
  CHECK_IN: "pill-soft",
  VOTING: "pill-gradient",
  STOPPED: "bg-border-5 text-faint",
  CLOSED: "bg-border-5 text-faint",
  NOT_STARTED: "bg-border-5 text-faint",
};

export function Pill({ kind, children }: { kind: string; children?: React.ReactNode }) {
  const cls = MAP[kind] || "bg-border-5 text-faint";
  return (
    <span
      className={`font-mono text-[10.5px] leading-none tracking-[.04em] rounded-md px-[7px] py-[5px] inline-block ${cls}`}
    >
      {children ?? kind}
    </span>
  );
}
