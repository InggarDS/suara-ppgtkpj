export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Inline label that swaps to a spinner + text while an action is in flight. */
export function BusyLabel({
  busy,
  children,
  busyText,
  spinnerClassName = "w-3.5 h-3.5",
}: {
  busy: boolean;
  children: React.ReactNode;
  busyText?: React.ReactNode;
  spinnerClassName?: string;
}) {
  if (!busy) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Spinner className={spinnerClassName} />
      {busyText ?? children}
    </span>
  );
}
