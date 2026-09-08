"use client";

import { useRef, useState, useTransition } from "react";
import { BusyLabel } from "@/components/ui/spinner";
import { updateTokenEmailTemplateAction } from "./actions";

const PLACEHOLDERS: { tag: string; desc: string }[] = [
  { tag: "[nama]", desc: "nama peserta" },
  { tag: "[jemaat]", desc: "jemaat peserta" },
  { tag: "[token]", desc: "token pribadi" },
  { tag: "[acara]", desc: "nama acara" },
  { tag: "[link]", desc: "tautan pendaftaran" },
];

const DEFAULT_BODY = `Halo [nama],

Berikut adalah token untuk [jemaat]: [token]

Buka [link] lalu masukkan token di atas untuk mendaftar pada "[acara]".
Token ini bersifat pribadi — jangan dibagikan.

Salam,
Panitia [acara]`;

export default function TokenEmailTemplate({
  eventId,
  subject,
  body,
}: {
  eventId: string;
  subject: string | null;
  body: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [subj, setSubj] = useState(subject ?? "");
  const [text, setText] = useState(body ?? "");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const custom = Boolean(body);

  function insert(tag: string) {
    const el = bodyRef.current;
    if (!el) {
      setText((t) => t + tag);
      return;
    }
    const s = el.selectionStart ?? text.length;
    const e = el.selectionEnd ?? text.length;
    const next = text.slice(0, s) + tag + text.slice(e);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = s + tag.length;
    });
  }

  function save(resetToDefault = false) {
    setNotice(null);
    startTransition(async () => {
      const res = resetToDefault
        ? await updateTokenEmailTemplateAction(eventId, "", "")
        : await updateTokenEmailTemplateAction(eventId, subj, text);
      if (res.ok) {
        if (resetToDefault) {
          setSubj("");
          setText("");
        }
        setNotice(resetToDefault ? "Kembali ke template bawaan." : "Template disimpan.");
      } else {
        setNotice(res.error ?? "Gagal menyimpan.");
      }
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-border-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] font-medium text-brand inline-flex items-center gap-1.5"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Template email {custom ? "(kustom)" : "(bawaan)"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-faint">Sisipkan:</span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.tag}
                type="button"
                onClick={() => insert(p.tag)}
                title={p.desc}
                className="font-mono text-[10.5px] text-brand bg-brand-soft rounded px-1.5 py-1 hover:bg-[rgba(27,77,228,.18)]"
              >
                {p.tag}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-body mb-1">Subjek</label>
            <input
              value={subj}
              onChange={(e) => setSubj(e.target.value)}
              placeholder="Token Anda untuk [acara]"
              className="w-full border border-border-1 rounded-lg px-3 py-2 text-[13px] text-ink bg-card outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-body mb-1">Isi email</label>
            <textarea
              ref={bodyRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              placeholder={DEFAULT_BODY}
              className="w-full border border-border-1 rounded-lg px-3 py-2 text-[12.5px] font-mono leading-relaxed text-ink bg-card outline-none focus:border-brand resize-y"
            />
            <p className="mt-1 text-[10.5px] text-faint">
              Kosongkan subjek &amp; isi lalu simpan untuk memakai template bawaan. Placeholder tidak peka huruf besar/kecil.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => save(false)}
              disabled={pending}
              className="text-[12px] font-semibold btn-gradient rounded-full px-4 py-1.5 disabled:opacity-50"
            >
              <BusyLabel busy={pending} busyText="Menyimpan…">Simpan template</BusyLabel>
            </button>
            {custom && (
              <button
                onClick={() => save(true)}
                disabled={pending}
                className="text-[12px] font-medium text-body bg-border-5 border border-border-1 rounded-full px-3.5 py-1.5 disabled:opacity-50"
              >
                Pakai bawaan
              </button>
            )}
            {notice && <span className="text-[11.5px] text-brand">{notice}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
