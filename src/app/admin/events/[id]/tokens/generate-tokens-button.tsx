"use client";

import { useState, useTransition } from "react";
import { generateTokensAction } from "./actions";

export default function GenerateTokensButton({ eventId }: { eventId: string }) {
  const [count, setCount] = useState("50");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <input
        value={count}
        onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
        className="w-16 border border-border-1 rounded-lg px-2.5 py-2 font-mono text-[12.5px] text-ink bg-card outline-none focus:border-brand text-center"
      />
      <button
        disabled={pending || !Number(count)}
        onClick={() => startTransition(() => { void generateTokensAction(eventId, Number(count) || 0); })}
        className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[rgba(150,170,255,.16)] disabled:opacity-50"
      >
        {pending ? "Generating…" : `Generate ${count || 0} token${count === "1" ? "" : "s"}`}
      </button>
    </div>
  );
}
