import Link from "next/link";

const ACTIONS = [
  {
    key: "monitor",
    label: "Live monitoring",
    description: "Track turnout, quorum, and every vote as it lands — updates in real time.",
    icon: "M4 20V11M10 20V4M16 20v-6M2 20h20",
    highlight: true,
  },
  {
    key: "results",
    label: "Shared screen",
    description: "Compose the projector view and reveal candidate results with one click.",
    icon: "M3 4.5h18v12H3zM9 20.5h6",
    highlight: false,
  },
  {
    key: "tokens",
    label: "Access & tokens",
    description: "Share the invite link and manage every participant's personal token.",
    icon: "M14 8a5 5 0 1 0-4.6 5H11v3h3v-3h1.2A5 5 0 0 0 14 8Z",
    highlight: false,
  },
  {
    key: "data",
    label: "Data & cleanup",
    description: "Export the full audit trail, then reset or archive when you're done.",
    icon: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7",
    highlight: false,
  },
];

export default function QuickActionsSection({ eventId }: { eventId: string }) {
  return (
    <div className="rounded-[32px] bg-[#F3F6FD] px-6 py-10 sm:px-10 sm:py-12 flex flex-col items-center gap-9">
      <div className="flex flex-col items-center gap-3 text-center max-w-[520px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#3D7BFF] text-[11px] font-semibold px-3 py-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D7BFF]" />
          Quick actions
        </span>
        <h2 className="m-0 text-[26px] sm:text-[30px] font-extrabold tracking-tight text-[#0B1130] leading-tight">
          Everything you need, one click away
        </h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-[#5B6478]">
          Jump straight into the tools you&apos;ll reach for most while this event is running.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {ACTIONS.map((a) => (
          <Link
            key={a.key}
            href={`/admin/events/${eventId}/${a.key}`}
            className={`group flex flex-col gap-4 rounded-[26px] p-5 transition-transform hover:-translate-y-0.5 ${
              a.highlight
                ? "bg-[#3D7BFF] text-white shadow-[0_20px_45px_-18px_rgba(61,123,255,0.65)]"
                : "bg-white text-[#0B1130] shadow-[0_16px_40px_-24px_rgba(11,17,48,0.25)]"
            }`}
          >
            <span
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-none ${
                a.highlight ? "bg-white/20" : "bg-[#EEF3FF]"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={a.highlight ? "#ffffff" : "#3D7BFF"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={a.icon}></path>
              </svg>
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold tracking-tight mb-1.5">{a.label}</span>
              <span className={`block text-[12.5px] leading-relaxed ${a.highlight ? "text-white/80" : "text-[#5B6478]"}`}>
                {a.description}
              </span>
            </span>
            <span
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${
                a.highlight ? "text-white" : "text-[#3D7BFF]"
              }`}
            >
              Open
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="m10 6 6 6-6 6"></path>
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
