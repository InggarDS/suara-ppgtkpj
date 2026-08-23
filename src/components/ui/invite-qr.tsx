"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function InviteQrPanel({ url, eventName }: { url: string; eventName: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || dataUrl) return;
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: "#0b1130", light: "#ffffff" } }).then((generated) => {
      setDataUrl(generated);
    });
  }, [open, dataUrl, url]);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: eventName, text: `Join "${eventName}" on Suara`, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${eventName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`;
    a.click();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1"></rect>
          <path d="M14 14h3v3h-3zM14 20h3M20 14v3M17.5 20H21v-3"></path>
        </svg>
        QR code
      </button>
      <button
        type="button"
        onClick={share}
        className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer"
      >
        {copied ? "Link copied" : "Share"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="elevated bg-card border border-border-1 rounded-3xl p-7 w-full max-w-sm flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-ink text-center">{eventName}</div>
            <div className="bg-white rounded-2xl p-4 w-full flex items-center justify-center">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="Invite QR code" width={240} height={240} />
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center text-xs text-faint">Generating…</div>
              )}
            </div>
            <div className="font-mono text-[11px] text-body break-all text-center">{url}</div>
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={download}
                disabled={!dataUrl}
                className="flex-1 text-[12.5px] font-medium text-white bg-brand rounded-lg px-3.5 py-2.5 cursor-pointer disabled:opacity-50"
              >
                Download PNG
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
