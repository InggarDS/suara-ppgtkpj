"use client";

export function Toggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`w-[34px] h-5 rounded-full border-none p-0.5 cursor-pointer flex flex-none transition-all duration-150 ${
        on ? "pill-gradient justify-end" : "bg-hairline justify-start"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="block w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(9,24,90,.4)]" />
    </button>
  );
}
