"use client";

import { useState, useTransition } from "react";
import { compressImage } from "@/lib/compress-image";
import { updateBannerAction } from "../../actions";

export default function BannerEditor({ eventId, bannerImage }: { eventId: string; bannerImage: string | null }) {
  const [banner, setBanner] = useState(bannerImage);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file, 1200, 700_000);
      setBanner(compressed);
      startTransition(() => { void updateBannerAction(eventId, compressed); });
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setBanner(null);
    startTransition(() => { void updateBannerAction(eventId, null); });
  }

  return (
    <div className="bg-card border border-border-1 rounded-xl p-4 flex items-center gap-4">
      {banner ? (
        <img src={banner} alt="" className="w-28 h-16 rounded-lg object-cover flex-none" />
      ) : (
        <div className="w-28 h-16 rounded-lg bg-border-5 border border-dashed border-border-2 flex-none flex items-center justify-center text-[10px] text-fainter text-center leading-tight">
          No banner
        </div>
      )}
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-ink">Event banner</div>
        <div className="text-[11.5px] text-faint">Shown at the top of the participant registration screen.</div>
      </div>
      <label className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-[#EAE7E0]">
        <input type="file" accept="image/*" className="hidden" onChange={onChange} />
        {busy || pending ? "Saving…" : banner ? "Change" : "Upload"}
      </label>
      {banner && (
        <button onClick={remove} disabled={pending} className="text-[12.5px] text-faint hover:text-danger cursor-pointer">
          Remove
        </button>
      )}
    </div>
  );
}
