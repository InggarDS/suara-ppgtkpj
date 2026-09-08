"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { sendAllTokenEmailsAction } from "./actions";

export default function SendAllTokensButton({
  eventId,
  withEmailCount,
  emailReady,
}: {
  eventId: string;
  withEmailCount: number;
  emailReady: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  return (
    <div className="flex items-center gap-2.5">
      <button
        disabled={!emailReady || withEmailCount === 0}
        onClick={() => {
          setNotice(null);
          setOpen(true);
        }}
        title={
          !emailReady
            ? "Layanan email belum dikonfigurasi"
            : withEmailCount === 0
              ? "Belum ada peserta dengan alamat email"
              : undefined
        }
        className="text-[12.5px] font-medium text-white bg-brand rounded-lg px-3.5 py-2 cursor-pointer hover:bg-brand-hover disabled:opacity-50"
      >
        Kirim token ke semua ({withEmailCount})
      </button>
      {notice && (
        <span className={`text-[11.5px] ${notice.kind === "ok" ? "text-brand" : "text-danger"}`}>{notice.text}</span>
      )}

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        title="Kirim token via email"
        body={`Kirim email berisi token pribadi ke ${withEmailCount} peserta yang memiliki alamat email?`}
        confirmLabel="Kirim sekarang"
        action={async () => {
          const res = await sendAllTokenEmailsAction(eventId);
          if (res.ok) {
            setNotice({ kind: "ok", text: `${res.sent ?? 0} email terkirim.` });
            router.refresh();
            return { ok: true };
          }
          if (typeof res.sent === "number" && res.sent > 0) {
            setNotice({ kind: "err", text: `${res.sent} terkirim, ${res.failed ?? 0} gagal.` });
            router.refresh();
          }
          return { ok: false, error: res.error };
        }}
      />
    </div>
  );
}
