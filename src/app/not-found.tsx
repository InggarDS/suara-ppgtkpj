import type { Metadata } from "next";
import Link from "next/link";
import { PpgtLogo } from "@/components/ui/ppgt-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan — Suara",
};

/**
 * App-wide 404. Covers a bad/mistyped URL and any explicit `notFound()` call
 * that isn't already handled by a more specific screen (the participant app's
 * own "Acara telah berakhir" state covers a deleted/invalid event — this is
 * the generic fallback for everything else).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-4 py-8 gap-6">
      <div className="elevated relative w-full max-w-[420px] bg-paper rounded-[34px] border border-border-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-6 pt-5 pb-1">
          <PpgtLogo size={22} className="rounded-[6px] flex-none" />
          <span className="text-[13px] font-semibold text-ink">Suara</span>
          <span className="flex-1" />
          <ThemeToggle />
        </div>

        <div className="flex flex-col items-center text-center px-6.5 py-8 gap-5">
          <div className="w-14 h-14 rounded-full bg-border-2 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C76A0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
              <path d="M8.5 11h5" />
            </svg>
          </div>
          <div>
            <div className="font-mono text-[11px] tracking-[.16em] text-fainter uppercase mb-2">404</div>
            <h1 className="m-0 mb-2 text-xl font-semibold tracking-tight text-ink">Halaman tidak ditemukan</h1>
            <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[32ch] mx-auto">
              Tautan yang Anda buka tidak ada atau sudah tidak berlaku. Periksa kembali alamatnya.
            </p>
          </div>
          <Link
            href="/"
            className="btn-gradient rounded-full px-5 py-3 text-[13.5px] font-semibold cursor-pointer"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
      <div className="text-[11px] text-faint">© PPGT Klasis Pulau Jawa 2026</div>
    </div>
  );
}
