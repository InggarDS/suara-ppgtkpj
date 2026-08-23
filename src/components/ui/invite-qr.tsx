"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useQrDataUrl(url: string, size = 240) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: "#0b1130", light: "#ffffff" } }).then((generated) => {
      if (!cancelled) setDataUrl(generated);
    });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return dataUrl;
}

export function QrImage({ url, size, className }: { url: string; size: number; className?: string }) {
  const dataUrl = useQrDataUrl(url, size * 2);
  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-border-5 text-faint text-[10px] font-mono ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        …
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="Invite QR code" width={size} height={size} className={className} />;
}

export function downloadQr(url: string, filename: string, size = 480) {
  QRCode.toDataURL(url, { width: size, margin: 2, color: { dark: "#0b1130", light: "#ffffff" } }).then((dataUrl) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  });
}

export function InviteQrPanel({ url, eventName }: { url: string; eventName: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
    downloadQr(url, `${eventName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View QR code"
        className="flex-none rounded-lg border border-border-1 bg-white p-1 cursor-pointer"
      >
        <QrImage url={url} size={40} className="rounded" />
      </button>
      <button
        type="button"
        onClick={download}
        className="text-[12.5px] font-medium text-ink bg-border-5 border border-border-1 rounded-lg px-3.5 py-2 cursor-pointer"
      >
        Download QR
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
              <QrImage url={url} size={240} />
            </div>
            <div className="font-mono text-[11px] text-body break-all text-center">{url}</div>
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={download}
                className="flex-1 text-[12.5px] font-medium text-white bg-brand rounded-lg px-3.5 py-2.5 cursor-pointer"
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
