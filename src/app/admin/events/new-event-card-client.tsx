"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventAction } from "../actions";
import { compressImage } from "@/lib/compress-image";

const defaultStages = ["Pemilihan Bakal Calon", "Pemilihan Calon Tetap", ""];

export default function NewEventCardClient() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [stageCount, setStageCount] = useState(2);
  const [stageNames, setStageNames] = useState<string[]>(defaultStages);
  const [participants, setParticipants] = useState("300");
  const [threshold, setThreshold] = useState(10);
  const [openNow, setOpenNow] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const valid = name.trim().length > 2;

  async function onBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerBusy(true);
    try {
      setBanner(await compressImage(file, 1200, 700_000));
    } finally {
      setBannerBusy(false);
    }
  }

  function submit() {
    if (!valid) return;
    startTransition(async () => {
      const res = await createEventAction({
        name,
        description: desc,
        expectedParticipants: Number(participants) || 0,
        openNow,
        stageNames: stageNames.slice(0, stageCount),
        threshold,
        bannerImage: banner,
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/admin/events/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border border-dashed border-border-2 rounded-xl bg-transparent min-h-[174px] flex flex-col items-center justify-center gap-2 cursor-pointer text-faint hover:border-brand hover:text-brand"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"></path>
        </svg>
        <span className="text-[13px] font-medium">New event</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/42 flex items-center justify-center z-[60] p-8">
          <div className="bg-card rounded-2xl max-w-[620px] w-full max-h-[88vh] overflow-auto shadow-2xl animate-rise-in">
            <div className="px-7 pt-6 pb-4.5 border-b border-border-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="text-lg font-semibold text-ink tracking-tight mb-1">New event</div>
                <p className="m-0 text-xs leading-relaxed text-body">
                  Create the ballot now, invite participants later. Nothing goes live until you open access.
                </p>
              </div>
            </div>

            <div className="px-7 py-5.5 flex flex-col gap-4.5">
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Event name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pemilihan Ketua Umum 2026"
                  className="w-full border border-border-1 rounded-[10px] px-3.5 py-3 text-sm text-ink bg-paper outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">
                  Description <span className="text-fainter font-normal">optional</span>
                </label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="One line participants will see on the registration screen"
                  className="w-full border border-border-1 rounded-[10px] px-3.5 py-3 text-sm text-ink bg-paper outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">
                  Banner image <span className="text-fainter font-normal">optional, shown to participants</span>
                </label>
                <label
                  className={`flex items-center w-full rounded-[10px] p-3 cursor-pointer transition-all ${
                    banner ? "bg-[#F3F8F5] border-[1.5px] border-brand-soft-border-2" : "bg-paper border-[1.5px] border-dashed border-border-2"
                  }`}
                >
                  <input type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
                  {banner ? (
                    <span className="flex items-center gap-3 w-full">
                      <img src={banner} alt="" className="w-20 h-12 rounded-md object-cover flex-none" />
                      <span className="flex-1 text-left text-[12.5px] font-medium text-ink">Banner selected</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setBanner(null);
                        }}
                        className="text-[11px] text-faint hover:text-danger"
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <span className="text-[12.5px] text-faint mx-auto">
                      {bannerBusy ? "Compressing…" : "Click to upload a banner (wide image works best)"}
                    </span>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Voting flow</label>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setStageCount(n)}
                      className={`flex-1 rounded-lg py-2.5 text-xs font-medium cursor-pointer border transition-colors ${
                        stageCount === n
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-border-1 bg-white text-body"
                      }`}
                    >
                      {n === 1 ? "1 stage" : `${n} stages`}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: stageCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-fainter w-[52px] flex-none">STAGE {i + 1}</span>
                      <input
                        value={stageNames[i] ?? ""}
                        onChange={(e) => {
                          const next = [...stageNames];
                          next[i] = e.target.value;
                          setStageNames(next);
                        }}
                        placeholder="Stage name"
                        className="flex-1 border border-border-1 rounded-[9px] px-3 py-2.5 text-[13px] text-ink bg-paper outline-none focus:border-brand"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 items-end">
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">Expected participants</label>
                  <input
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    className="w-full border border-border-1 rounded-[10px] px-3 py-2.5 font-mono text-sm text-ink bg-paper outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <label className="text-xs font-medium text-body">Minimum voters to advance</label>
                    <span className="flex-1" />
                    <span className="font-mono text-xs text-ink font-medium">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Number(participants) || 300}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-brand"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-paper-2 border border-border-3 rounded-xl px-3.5 py-3">
                <span className="flex-1">
                  <span className="block text-[12.5px] font-medium text-ink">Open access immediately</span>
                  <span className="block text-[11.5px] text-faint leading-snug">
                    Participants can register as soon as the event is created
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setOpenNow((v) => !v)}
                  className={`w-[34px] h-5 rounded-full border-none p-0.5 cursor-pointer flex flex-none ${
                    openNow ? "bg-brand justify-end" : "bg-hairline justify-start"
                  }`}
                >
                  <span className="block w-4 h-4 rounded-full bg-white shadow" />
                </button>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>

            <div className="px-7 py-4 border-t border-border-4 flex items-center gap-2.5">
              <span className="flex-1 text-[11.5px] text-fainter">Stages and thresholds stay editable after creation.</span>
              <button
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-ink-soft bg-border-5 border border-border-1 rounded-lg px-3.5 py-2.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!valid || pending}
                className={`text-[13px] font-semibold rounded-lg px-4 py-2.5 border-none transition-colors ${
                  valid ? "bg-brand text-white cursor-pointer hover:bg-brand-hover" : "bg-[#E4E9E6] text-[#A8B5AF] cursor-not-allowed"
                }`}
              >
                {pending ? "Creating…" : "Create event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
