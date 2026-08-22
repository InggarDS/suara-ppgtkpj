"use client";

import { useState, useTransition } from "react";
import { updateTokenFormatAction } from "./actions";

export default function TokenFormatSettings({
  eventId,
  tokenPrefix,
  tokenSuffix,
}: {
  eventId: string;
  tokenPrefix: string;
  tokenSuffix: string;
}) {
  const [prefix, setPrefix] = useState(tokenPrefix);
  const [suffix, setSuffix] = useState(tokenSuffix);
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateTokenFormatAction(eventId, prefix, suffix);
      setSaved(true);
    });
  }

  return (
    <div className="bg-card border border-border-1 rounded-xl p-5">
      <div className="text-sm font-semibold text-ink mb-1">Token format</div>
      <p className="m-0 mb-3.5 text-xs leading-relaxed text-body">
        Applies to tokens generated from now on. Existing tokens keep their current format.
      </p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-body mb-1.5">Prefix</label>
          <input
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setSaved(false);
            }}
            placeholder="TOK-"
            className="w-full border border-border-1 rounded-lg px-3 py-2 font-mono text-sm text-ink bg-paper outline-none focus:border-brand"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-body mb-1.5">Suffix</label>
          <input
            value={suffix}
            onChange={(e) => {
              setSuffix(e.target.value);
              setSaved(false);
            }}
            placeholder=""
            className="w-full border border-border-1 rounded-lg px-3 py-2 font-mono text-sm text-ink bg-paper outline-none focus:border-brand"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-body mb-1.5">Preview</label>
          <div className="border border-border-1 rounded-lg px-3 py-2 font-mono text-sm text-ink-soft bg-paper-2">
            {prefix}0000{suffix}
          </div>
        </div>
        <button
          onClick={save}
          disabled={pending || saved}
          className={`text-[12.5px] font-medium rounded-lg px-3.5 py-2 border-none ${
            saved ? "bg-border-5 text-fainter cursor-default" : "bg-brand text-white cursor-pointer hover:bg-brand-hover"
          }`}
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
