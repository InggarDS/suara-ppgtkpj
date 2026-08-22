"use client";

import { useTransition } from "react";
import { generateTokensAction } from "./actions";

export default function GenerateTokensButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { void generateTokensAction(eventId, 50); })}
      className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[#EAE7E0] disabled:opacity-50"
    >
      {pending ? "Generating…" : "Generate 50 tokens"}
    </button>
  );
}
