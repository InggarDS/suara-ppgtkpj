"use client";

import { useEffect, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { initials } from "@/lib/ids";
import { parseDeviceLabel } from "@/lib/device";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Spinner, BusyLabel } from "@/components/ui/spinner";
import { TopProgress } from "@/components/ui/top-progress";
import { useEventStream } from "@/hooks/use-event-stream";

type StateResp = {
  eventName: string;
  eventStatus: string;
  bannerImage: string | null;
  useCredentials: boolean;
  closed: boolean;
  liveStage: {
    id: string;
    order: number;
    name: string;
    phase: "checkin" | "voting" | null;
    allowAbstain: boolean;
    candidates: { id: string; name: string; note: string; photo: string | null }[];
  } | null;
  totalStages: number;
  stages: { order: number; name: string; status: string }[];
  lastCompletedStage: { order: number; name: string } | null;
  eventFinished: boolean;
  valid?: boolean;
  registered?: boolean;
  name?: string | null;
  token?: string;
  votedLiveStage?: boolean;
  checkedIn?: boolean;
};

function getDeviceId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("suara_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("suara_device_id", id);
  }
  return id;
}

export default function ParticipantApp({ publicId, eventName }: { publicId: string; eventName: string }) {
  const [client, setClient] = useState<{ hydrated: boolean; deviceId: string; token: string | null }>({
    hydrated: false,
    deviceId: "",
    token: null,
  });
  const { hydrated, deviceId, token } = client;
  const setToken = (t: string) => setClient((c) => ({ ...c, token: t }));
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Reading localStorage requires the client; this mount-only sync is the standard escape hatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient({ hydrated: true, deviceId: getDeviceId(), token: localStorage.getItem(`suara_token_${publicId}`) });
  }, [publicId]);

  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  const streamUrl = hydrated ? `/api/public/events/${publicId}/stream${q}` : null;
  const data = useEventStream<StateResp>(streamUrl, hydrated ? `/api/public/events/${publicId}/state${q}` : undefined);

  function handleRegistered(tok: string) {
    localStorage.setItem(`suara_token_${publicId}`, tok);
    setToken(tok); // token change reconnects the stream with the new token
  }

  let screen: "loading" | "register" | "closed" | "waiting" | "checkin" | "checkedin" | "booth" | "done" =
    "loading";
  if (data) {
    if (data.closed) screen = "closed";
    else if (!token || data.valid === false) screen = "register";
    else if (data.liveStage && data.votedLiveStage) screen = "done";
    else if (data.liveStage && !data.checkedIn) screen = "checkin";
    else if (data.liveStage && data.checkedIn && data.liveStage.phase === "checkin") screen = "checkedin";
    else if (data.liveStage && data.checkedIn && data.liveStage.phase === "voting") screen = "booth";
    else screen = "waiting";
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center py-8 px-4">
      <div className="flex-1 flex items-start sm:items-center justify-center w-full">
      <div className="elevated relative w-full max-w-[420px] bg-paper rounded-[34px] border border-border-1 min-h-[600px] flex flex-col overflow-hidden">
        <TopProgress active={processing || screen === "loading"} />
        <div className="flex items-center gap-2 px-6 pt-5 pb-1">
          <div className="w-[22px] h-[22px] rounded-[9px] bg-brand flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 9.5 18 20 6.5"></path>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-ink">Suara</span>
          <span className="flex-1" />
          <ThemeToggle />
        </div>

        {data && data.stages.length > 1 && ["waiting", "checkin", "checkedin", "booth", "done"].includes(screen) && (
          <StageTrack stages={data.stages} currentOrder={data.liveStage?.order ?? data.lastCompletedStage?.order ?? null} />
        )}

        {screen === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-faint">
            <Spinner className="w-6 h-6 text-brand" />
            Memuat…
          </div>
        )}
        {screen === "register" && (
          <RegisterScreen
            publicId={publicId}
            eventName={eventName}
            bannerImage={data?.bannerImage ?? null}
            useCredentials={data?.useCredentials ?? false}
            deviceId={deviceId}
            onDone={handleRegistered}
            onBusyChange={setProcessing}
          />
        )}
        {screen === "closed" && <ClosedScreen eventName={eventName} publicId={publicId} />}
        {screen === "waiting" && data && (
          <WaitingScreen
            eventName={eventName}
            name={data.name ?? ""}
            token={data.token ?? ""}
            totalStages={data.totalStages}
            lastCompletedStage={data.lastCompletedStage}
            eventFinished={data.eventFinished}
          />
        )}
        {screen === "checkin" && data?.liveStage && token && (
          <CheckInScreen
            publicId={publicId}
            token={token}
            eventName={eventName}
            stageName={data.liveStage.name}
            phase={data.liveStage.phase}
            name={data.name ?? ""}
            onBusyChange={setProcessing}
          />
        )}
        {screen === "checkedin" && data && (
          <CheckedInScreen eventName={eventName} name={data.name ?? ""} stageName={data.liveStage?.name ?? ""} />
        )}
        {screen === "booth" && data?.liveStage && token && (
          <BoothScreen
            publicId={publicId}
            token={token}
            stage={data.liveStage}
            totalStages={data.totalStages}
            onVoted={() => {}}
            onBusyChange={setProcessing}
          />
        )}
        {screen === "done" && data && <DoneScreen token={data.token ?? ""} stageName={data.liveStage?.name ?? ""} />}
      </div>
      </div>
      <div className="text-[11px] text-faint pt-6">© PPGT Klasis Pulau Jawa 2026</div>
    </div>
  );
}

function PhotoField({
  photo,
  uploading,
  onChange,
}: {
  photo: string | null;
  uploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-body mb-1.5">Foto profil</label>
      <label
        className={`flex items-center w-full rounded-[22px] p-3.5 transition-all ${
          uploading ? "cursor-wait" : "cursor-pointer"
        } ${
          photo ? "bg-[rgba(27,77,228,.12)] border-[1.5px] border-brand-soft-border-2" : "bg-card border-[1.5px] border-dashed border-border-2"
        }`}
      >
        <input type="file" accept="image/*" capture="user" className="hidden" onChange={onChange} disabled={uploading} />
        {photo ? (
          <span className="flex items-center gap-3 w-full">
            <img src={photo} alt="" className="w-12 h-12 rounded-xl object-cover flex-none" />
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[13px] font-medium text-ink">Foto terpilih</span>
              <span className="block font-mono text-[11.5px] leading-relaxed text-brand">
                {uploading ? "mengompres…" : "terkompresi"}
              </span>
            </span>
            {uploading ? (
              <Spinner className="w-4 h-4 text-brand flex-none" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a5cf0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                <path d="M4 12.5 9.5 18 20 6.5"></path>
              </svg>
            )}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1.5 w-full py-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C76A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"></path>
            </svg>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
              {uploading && <Spinner className="w-3.5 h-3.5 text-brand" />}
              {uploading ? "Mengompres…" : "Ambil atau unggah foto"}
            </span>
            <span className="text-[11.5px] text-faint">Dikompresi hingga ≤ 500 KB di ponsel Anda</span>
          </span>
        )}
      </label>
    </div>
  );
}

function RegisterScreen({
  publicId,
  eventName,
  bannerImage,
  useCredentials,
  deviceId,
  onDone,
  onBusyChange,
}: {
  publicId: string;
  eventName: string;
  bannerImage: string | null;
  useCredentials: boolean;
  deviceId: string;
  onDone: (token: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [step, setStep] = useState<"name" | "token">("name");
  const [name, setName] = useState("");
  const [jemaat, setJemaat] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [credentialMatch, setCredentialMatch] = useState<"idle" | "checking" | "found" | "not-found">("idle");

  // action-specific loading — never one global flag
  const [isUploadingPhoto, setUploadingPhoto] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false); // held after success until the stream swaps the screen
  const [isResendingToken, setResendingToken] = useState(false);

  // "Belum mendapatkan token?"
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isValidatingName = useCredentials && name.trim() !== "" && credentialMatch === "checking";
  const submitBusy = isSubmitting || submitted;
  const working = isUploadingPhoto || submitBusy || isResendingToken || isValidatingName;
  useEffect(() => {
    onBusyChange?.(working);
    return () => onBusyChange?.(false);
  }, [working, onBusyChange]);

  useEffect(() => {
    if (!useCredentials || step !== "name") return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const handle = setTimeout(async () => {
      setCredentialMatch("checking");
      try {
        const res = await fetch(`/api/public/events/${publicId}/credential-lookup?name=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json.found) {
          setCredentialMatch("found");
          setJemaat(json.jemaat);
        } else {
          setCredentialMatch("not-found");
          setJemaat("");
        }
      } catch {
        setCredentialMatch("not-found");
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [name, publicId, useCredentials, step]);

  const effectiveCredentialMatch = name.trim() ? credentialMatch : "idle";
  const displayJemaat = name.trim() ? jemaat : "";

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isUploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError("Gagal memproses foto. Coba lagi.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const nameValidated = Boolean(name.trim()) && credentialMatch === "found";

  function goToToken() {
    setError(undefined);
    if (!name.trim()) return setError("Masukkan nama Anda.");
    if (!nameValidated) return setError("Nama tidak sesuai kredensi.");
    setStep("token");
  }

  async function resendToken() {
    if (isResendingToken) return;
    setResendMsg(null);
    if (!resendEmail.trim()) {
      setResendMsg({ kind: "err", text: "Masukkan alamat email." });
      return;
    }
    setResendingToken(true);
    try {
      const res = await fetch(`/api/public/events/${publicId}/resend-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const json = await res.json();
      setResendMsg(
        json.ok
          ? { kind: "ok", text: "Token telah dikirim kembali ke email Anda." }
          : { kind: "err", text: json.error || "Email tidak terdaftar." }
      );
    } catch {
      setResendMsg({ kind: "err", text: "Gagal mengirim. Coba lagi nanti." });
    } finally {
      setResendingToken(false);
    }
  }

  async function submit(payloadToken: string | undefined) {
    if (submitBusy) return;
    setError(undefined);
    if (!useCredentials && (!name.trim() || !jemaat.trim() || !tokenInput.trim())) {
      setError("Masukkan nama, jemaat, dan token pribadi Anda.");
      return;
    }
    if (useCredentials && !tokenInput.trim()) {
      setError("Masukkan token Anda.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${publicId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: payloadToken,
          name: name.trim(),
          jemaat: useCredentials ? undefined : jemaat.trim(),
          photo,
          deviceId,
          deviceLabel: parseDeviceLabel(navigator.userAgent),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Registrasi gagal.");
        return;
      }
      setSubmitted(true); // keep the button busy until the stream swaps to the next screen
      onDone(json.token);
    } catch {
      setError("Registrasi gagal. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <div className={bannerImage ? "px-6" : "px-6 pt-3.5"}>
      <div className="font-mono text-[10px] tracking-[.1em] text-faint uppercase mb-2">{publicId}</div>
      <div className="text-[13px] font-semibold text-brand mb-1">Selamat datang di</div>
      <h2 className="m-0 mb-1.5 text-2xl font-semibold tracking-tight text-ink leading-tight text-pretty">{eventName}</h2>
      <p className="m-0 text-[13.5px] leading-relaxed text-body">
        {useCredentials
          ? step === "name"
            ? "Masukkan nama persis seperti yang terdaftar di panitia. Jemaat akan terisi otomatis."
            : "Masukkan token yang dikirim ke email Anda."
          : "Daftar sekali untuk menerima surat suara Anda. Token Anda telah dikirim bersama undangan."}
      </p>
    </div>
  );

  /* ---------- credential mode: step 2 — token ---------- */
  if (useCredentials && step === "token") {
    return (
      <div className="flex-1 overflow-auto flex flex-col gap-5 pb-6.5">
        {bannerImage && <img src={bannerImage} alt="" className="w-full h-36 object-cover flex-none" />}
        {header}

        <div className="flex flex-col gap-3.5 px-6">
          <div className="w-full bg-card border border-border-1 rounded-[22px] p-3.5 flex items-center gap-3">
            <span className="w-10.5 h-10.5 rounded-[20px] bg-border-4 text-body text-[13px] font-semibold flex items-center justify-center flex-none">
              {initials(name)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-ink truncate">{name}</span>
              <span className="block text-[11.5px] text-faint truncate">{jemaat}</span>
            </span>
            <button
              onClick={() => {
                setStep("name");
                setError(undefined);
              }}
              className="text-[11.5px] text-brand font-medium px-1 flex-none"
            >
              Ubah
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-body mb-1.5">Token</label>
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="TOK-0000"
              autoFocus
              className="w-full border border-border-1 rounded-[20px] px-3.5 py-3.5 font-mono text-[15px] tracking-[.06em] text-ink bg-card outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => {
                setShowResend((v) => !v);
                setResendMsg(null);
              }}
              className="mt-2 text-[12.5px] font-medium text-brand underline decoration-dotted"
            >
              Belum mendapatkan token?
            </button>
          </div>

          {showResend && (
            <div className="flex flex-col gap-2 bg-paper-2 border border-border-3 rounded-[20px] p-3.5">
              <label className="block text-xs font-medium text-body">Email terdaftar</label>
              <input
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="email@contoh.com"
                inputMode="email"
                className="w-full border border-border-1 rounded-[16px] px-3 py-2.5 text-[14px] text-ink bg-card outline-none focus:border-brand"
              />
              <button
                onClick={resendToken}
                disabled={isResendingToken}
                className="btn-gradient w-full rounded-full py-2.5 text-[13.5px] font-semibold cursor-pointer disabled:opacity-60"
              >
                <BusyLabel busy={isResendingToken} busyText="Mengirim…" spinnerClassName="w-3.5 h-3.5">
                  Kirim Kembali Token
                </BusyLabel>
              </button>
              {resendMsg && (
                <p className={`m-0 text-[12px] ${resendMsg.kind === "ok" ? "text-brand" : "text-danger"}`}>
                  {resendMsg.text}
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger m-0 px-6">{error}</p>}

        <div className="mt-auto flex flex-col gap-2.5 px-6">
          <button
            onClick={() => submit(tokenInput.trim())}
            disabled={submitBusy || !tokenInput.trim()}
            className="btn-gradient w-full rounded-full py-4 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            <BusyLabel busy={submitBusy} busyText="Memproses…" spinnerClassName="w-4 h-4">Daftar</BusyLabel>
          </button>
          <p className="m-0 text-[11.5px] leading-relaxed text-faint text-center">Satu perangkat, satu token, satu suara per stage.</p>
        </div>
      </div>
    );
  }

  /* ---------- credential mode: step 1 — name / non-credential: single screen ---------- */
  return (
    <div className="flex-1 overflow-auto flex flex-col gap-5 pb-6.5">
      {bannerImage && <img src={bannerImage} alt="" className="w-full h-36 object-cover flex-none" />}
      {header}

      <div className="flex flex-col gap-3.5 px-6">
        <div>
          <label className="block text-xs font-medium text-body mb-1.5">Nama lengkap</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Inggar Saputra"
            className={`w-full border rounded-[20px] px-3.5 py-3.5 text-[15px] text-ink bg-card outline-none focus:border-brand ${
              useCredentials && effectiveCredentialMatch === "not-found" ? "border-danger" : "border-border-1"
            }`}
          />
          {useCredentials && effectiveCredentialMatch === "checking" && (
            <p className="m-0 mt-1.5 inline-flex items-center gap-1.5 text-xs text-faint">
              <Spinner className="w-3 h-3" />
              Memeriksa kredensi…
            </p>
          )}
          {useCredentials && effectiveCredentialMatch === "found" && (
            <p className="m-0 mt-1.5 text-xs text-brand">Nama cocok dengan kredensi</p>
          )}
          {useCredentials && effectiveCredentialMatch === "not-found" && (
            <p className="m-0 mt-1.5 text-xs text-danger">Nama tidak sesuai kredensi</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-body mb-1.5">Jemaat</label>
          <input
            value={useCredentials ? displayJemaat : jemaat}
            onChange={(e) => !useCredentials && setJemaat(e.target.value)}
            readOnly={useCredentials}
            placeholder={useCredentials ? "Terisi otomatis setelah nama cocok" : "cth. Jemaat KPJ"}
            className={`w-full border border-border-1 rounded-[20px] px-3.5 py-3.5 text-[15px] text-ink outline-none focus:border-brand ${
              useCredentials ? "bg-border-5 text-body" : "bg-card"
            }`}
          />
        </div>
        {!useCredentials && (
          <div>
            <label className="block text-xs font-medium text-body mb-1.5">Token pribadi</label>
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="TOK-0000"
              className="w-full border border-border-1 rounded-[20px] px-3.5 py-3.5 font-mono text-[15px] tracking-[.06em] text-ink bg-card outline-none focus:border-brand"
            />
          </div>
        )}
        <PhotoField photo={photo} uploading={isUploadingPhoto} onChange={onPhotoChange} />
      </div>

      {error && <p className="text-xs text-danger m-0 px-6">{error}</p>}

      <div className="mt-auto flex flex-col gap-2.5 px-6">
        {useCredentials ? (
          <button
            onClick={goToToken}
            disabled={isValidatingName || isUploadingPhoto || !nameValidated}
            className="btn-gradient w-full rounded-full py-4 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            <BusyLabel busy={isValidatingName} busyText="Memeriksa…" spinnerClassName="w-4 h-4">Lanjut</BusyLabel>
          </button>
        ) : (
          <button
            onClick={() => submit(tokenInput.trim())}
            disabled={submitBusy || isUploadingPhoto}
            className="btn-gradient w-full rounded-full py-4 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            <BusyLabel busy={submitBusy} busyText="Memproses…" spinnerClassName="w-4 h-4">Daftar</BusyLabel>
          </button>
        )}
        <p className="m-0 text-[11.5px] leading-relaxed text-faint text-center">Satu perangkat, satu token, satu suara per stage.</p>
      </div>
    </div>
  );
}

function StageTrack({
  stages,
  currentOrder,
}: {
  stages: { order: number; name: string; status: string }[];
  currentOrder: number | null;
}) {
  const maxOrder = Math.max(...stages.map((s) => s.order));
  return (
    <div className="flex items-center gap-1.5 px-6 pb-3 pt-1 flex-none overflow-x-auto">
      {stages.map((s, i) => {
        const isFinal = s.order === maxOrder;
        const active = s.order === currentOrder;
        const done = s.status === "STOPPED" || s.status === "CLOSED";
        return (
          <div key={s.order} className="flex items-center gap-1.5 flex-none">
            <span
              className={`font-mono text-[10px] uppercase tracking-[.06em] rounded-full px-2 py-1 border whitespace-nowrap ${
                active
                  ? "border-brand text-brand bg-brand-soft"
                  : done
                    ? "border-border-2 text-body"
                    : "border-border-3 text-faint"
              }`}
            >
              {isFinal ? "Final" : s.name}
            </span>
            {i < stages.length - 1 && <span className="w-2.5 h-px bg-border-3 flex-none" />}
          </div>
        );
      })}
    </div>
  );
}

function CheckInScreen({
  publicId,
  token,
  eventName,
  stageName,
  phase,
  name,
  onBusyChange,
}: {
  publicId: string;
  token: string;
  eventName: string;
  stageName: string;
  phase: "checkin" | "voting" | null;
  name: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [isCheckingIn, setCheckingIn] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const checkInBusy = isCheckingIn || done; // stay busy past success until the stream swaps the screen

  useEffect(() => {
    onBusyChange?.(checkInBusy);
    return () => onBusyChange?.(false);
  }, [checkInBusy, onBusyChange]);

  async function checkIn() {
    if (checkInBusy) return;
    setCheckingIn(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/public/events/${publicId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Check-in gagal.");
        return;
      }
      setDone(true); // instant local confirmation; the stream flips the real screen shortly
    } catch {
      setError("Check-in gagal. Periksa koneksi Anda.");
    } finally {
      setCheckingIn(false);
    }
  }

  if (done) return <CheckedInScreen eventName={eventName} name={name} stageName={stageName} />;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-6 text-center">
      <div className="w-[66px] h-[66px] rounded-full bg-brand-soft flex items-center justify-center">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2a5cf0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12.5 11 15l4.5-5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <div>
        <div className="font-mono text-[10.5px] tracking-[.12em] text-faint uppercase mb-2">{eventName}</div>
        <h2 className="m-0 mb-2 text-[22px] font-semibold tracking-tight text-ink">Konfirmasi kehadiran</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[30ch] mx-auto">
          Stage <strong className="text-ink">{stageName}</strong> sudah dibuka. Tekan tombol di bawah untuk
          menandai kehadiran Anda{phase === "voting" ? " sebelum memilih" : ""}.
        </p>
      </div>
      {name && (
        <div className="w-full bg-card border border-border-1 rounded-[22px] p-3.5 flex items-center gap-3 text-left">
          <span className="w-10.5 h-10.5 rounded-[20px] bg-border-4 text-body text-[13px] font-semibold flex items-center justify-center flex-none">
            {initials(name)}
          </span>
          <span className="flex-1 min-w-0 text-sm font-semibold text-ink">{name}</span>
        </div>
      )}
      {error && <p className="text-xs text-danger m-0">{error}</p>}
      <button
        onClick={checkIn}
        disabled={isCheckingIn}
        className="btn-gradient w-full rounded-full py-4 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
      >
        <BusyLabel busy={isCheckingIn} busyText="Memproses…" spinnerClassName="w-4 h-4">Konfirmasi kehadiran</BusyLabel>
      </button>
    </div>
  );
}

function CheckedInScreen({ eventName, name, stageName }: { eventName: string; name: string; stageName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-6.5 text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <span className="absolute w-16 h-16 rounded-full border-[1.5px] border-brand animate-ring" />
        <span className="w-3 h-3 rounded-full bg-brand animate-pulse-dot" />
      </div>
      <div>
        <div className="font-mono text-[10.5px] tracking-[.12em] text-faint uppercase mb-2">{eventName}</div>
        <h2 className="m-0 mb-2 text-[22px] font-semibold tracking-tight text-ink">Anda sudah check-in</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[30ch] mx-auto">
          Menunggu pemungutan suara untuk <strong className="text-ink">{stageName}</strong> dibuka. Layar ini
          akan otomatis berpindah.
        </p>
      </div>
      <div className="w-full bg-card border border-border-1 rounded-[22px] p-3.5 flex items-center gap-3 text-left">
        <span className="w-10.5 h-10.5 rounded-[20px] bg-border-4 text-body text-[13px] font-semibold flex items-center justify-center flex-none">
          {name ? initials(name) : ""}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink">{name}</span>
          <span className="block font-mono text-[11.5px] leading-relaxed text-faint">hadir · siap memilih</span>
        </span>
        <span className="text-[11px] font-medium text-brand bg-brand-soft rounded-md px-2 py-1.5 flex-none">Siap</span>
      </div>
    </div>
  );
}

function WaitingScreen({
  eventName,
  name,
  token,
  totalStages,
  lastCompletedStage,
  eventFinished,
}: {
  eventName: string;
  name: string;
  token: string;
  totalStages: number;
  lastCompletedStage: { order: number; name: string } | null;
  eventFinished: boolean;
}) {
  const notStartedYet = !eventFinished && !lastCompletedStage;
  const title = eventFinished ? "Pemilihan selesai" : lastCompletedStage ? "Menunggu stage berikutnya" : "Voting Belum Dimulai";
  const body = eventFinished
    ? "Terima kasih sudah berpartisipasi. Hasil akhir dapat dilihat di layar bersama."
    : lastCompletedStage
      ? `Terima kasih untuk pemilihan di ${lastCompletedStage.name}. Selanjutnya akan dilakukan pemilihan di stage berikutnya.`
      : "Layar ini akan otomatis berpindah begitu admin membuka stage pertama.";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-6.5 text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <span className="absolute w-16 h-16 rounded-full border-[1.5px] border-brand animate-ring" />
        <span className="w-3 h-3 rounded-full bg-brand animate-pulse-dot" />
      </div>
      <div>
        {notStartedYet && (
          <div className="font-mono text-[10.5px] tracking-[.12em] text-faint uppercase mb-2">{eventName}</div>
        )}
        <h2 className="m-0 mb-2 text-[22px] font-semibold tracking-tight text-ink">{title}</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[30ch] mx-auto">{body}</p>
      </div>
      <div className="w-full bg-card border border-border-1 rounded-[22px] p-3.5 flex items-center gap-3 text-left">
        <span className="w-10.5 h-10.5 rounded-[20px] bg-border-4 text-body text-[13px] font-semibold flex items-center justify-center flex-none">
          {name ? initials(name) : ""}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink">{name}</span>
          <span className="block font-mono text-[11.5px] leading-relaxed text-faint">{token} · terdaftar</span>
        </span>
        <span className="text-[11px] font-medium text-brand bg-brand-soft rounded-md px-2 py-1.5 flex-none">Siap</span>
      </div>
      <div className="font-mono text-[11.5px] text-fainter">{totalStages} stage dikonfigurasi</div>
    </div>
  );
}

function BoothScreen({
  publicId,
  token,
  stage,
  totalStages,
  onVoted,
  onBusyChange,
}: {
  publicId: string;
  token: string;
  stage: {
    id: string;
    order: number;
    name: string;
    allowAbstain: boolean;
    candidates: { id: string; name: string; note: string; photo: string | null }[];
  };
  totalStages: number;
  onVoted: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [abstain, setAbstain] = useState(false);
  const [isSubmittingVote, setSubmittingVote] = useState(false);
  const [voteSent, setVoteSent] = useState(false); // held after success until the stream swaps to the done screen
  const [error, setError] = useState<string | undefined>();
  const voteBusy = isSubmittingVote || voteSent;

  useEffect(() => {
    onBusyChange?.(voteBusy);
    return () => onBusyChange?.(false);
  }, [voteBusy, onBusyChange]);

  async function submit() {
    if (voteBusy || (!choice && !abstain)) return;
    setSubmittingVote(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/public/events/${publicId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, candidateId: choice ?? undefined, abstain }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!json.ok) {
        setError(json.error || "Gagal mengirim suara. Coba lagi.");
        return;
      }
      setVoteSent(true);
      onVoted();
    } catch {
      setError("Gagal mengirim suara. Periksa koneksi Anda.");
    } finally {
      setSubmittingVote(false);
    }
  }

  const canSubmit = Boolean(choice || abstain);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-3 pb-3.5 border-b border-border-4 flex-none">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10px] tracking-[.1em] text-brand uppercase">
            Stage {stage.order} dari {totalStages}
          </span>
          <span className="flex-1 h-[3px] rounded bg-border-4 overflow-hidden">
            <span className="block w-full h-full bg-brand" />
          </span>
        </div>
        <h2 className="m-0 text-[19px] font-semibold tracking-tight text-ink">{stage.name}</h2>
      </div>

      <div className="flex-1 overflow-auto px-6 pt-4 pb-3 flex flex-col gap-2.5">
        {stage.candidates.map((c) => {
          const on = choice === c.id;
          return (
            <button
              key={c.id}
              disabled={voteBusy}
              onClick={() => {
                setChoice(c.id);
                setAbstain(false);
              }}
              className={`flex items-center gap-3.5 w-full p-3.5 rounded-2xl cursor-pointer text-left transition-all bg-card disabled:cursor-not-allowed ${
                on ? "border-[1.5px] border-brand shadow-[0_0_0_3px_rgba(27,77,228,.14)]" : "border-[1.5px] border-border-1"
              } ${voteBusy && !on ? "opacity-55" : ""}`}
            >
              {c.photo ? (
                <img src={c.photo} alt="" className="w-11.5 h-11.5 rounded-full object-cover flex-none" />
              ) : (
                <span
                  className={`w-11.5 h-11.5 rounded-full flex-none flex items-center justify-center text-[13px] font-semibold ${
                    on ? "bg-[rgba(27,77,228,.18)] text-brand" : "bg-border-4 text-faint"
                  }`}
                >
                  {initials(c.name)}
                </span>
              )}
              <span className="flex-1 text-left min-w-0">
                <span className="block text-[15px] font-semibold text-ink tracking-tight">{c.name}</span>
                {c.note && <span className="block text-xs leading-snug text-body">{c.note}</span>}
              </span>
              <span
                className={`w-5 h-5 rounded-full flex-none transition-all ${on ? "border-[6px] border-brand" : "border-[1.5px] border-border-2"}`}
              />
            </button>
          );
        })}

        {stage.allowAbstain && (
          <button
            disabled={voteBusy}
            onClick={() => {
              setAbstain(true);
              setChoice(null);
            }}
            className={`flex items-center gap-3.5 w-full p-3.5 rounded-2xl cursor-pointer text-left transition-all bg-card disabled:cursor-not-allowed ${
              abstain ? "border-[1.5px] border-brand shadow-[0_0_0_3px_rgba(27,77,228,.14)]" : "border-[1.5px] border-border-1"
            } ${voteBusy && !abstain ? "opacity-55" : ""}`}
          >
            <span className="flex-1 text-[15px] font-semibold text-ink">Golput</span>
            <span className={`w-5 h-5 rounded-full flex-none ${abstain ? "border-[6px] border-brand" : "border-[1.5px] border-border-2"}`} />
          </button>
        )}

        <div className="flex gap-2 items-start pt-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8D97C2" strokeWidth="1.7" strokeLinecap="round" className="flex-none mt-0.5">
            <path d="M12 3 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-4Z"></path>
          </svg>
          <span className="text-[11.5px] leading-relaxed text-faint">Suara Anda bersifat anonim. Hanya status bahwa Anda telah memilih yang dicatat pada token Anda.</span>
        </div>
      </div>

      <div className="flex-none px-6 pt-3.5 pb-6.5 border-t border-border-4 bg-paper">
        {error && <p className="text-xs text-danger m-0 mb-2 text-center">{error}</p>}
        <button
          onClick={submit}
          disabled={!canSubmit || voteBusy}
          className={`w-full rounded-full py-4 text-[15px] font-semibold border-none transition-colors ${
            canSubmit ? "btn-gradient cursor-pointer disabled:opacity-60" : "bg-border-4 text-fainter cursor-not-allowed"
          }`}
        >
          <BusyLabel busy={voteBusy} busyText={voteSent ? "Suara terkirim…" : "Mengirim…"} spinnerClassName="w-4 h-4">
            {canSubmit ? "Kirim suara" : "Pilih kandidat"}
          </BusyLabel>
        </button>
      </div>
    </div>
  );
}

function DoneScreen({ token, stageName }: { token: string; stageName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-5.5 text-center">
      <div className="w-[66px] h-[66px] rounded-full bg-brand-soft flex items-center justify-center animate-rise-in">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2a5cf0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9.5 18 20 6.5"></path>
        </svg>
      </div>
      <div>
        <h2 className="m-0 mb-2 text-[23px] font-semibold tracking-tight text-ink">Suara tercatat</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[28ch] mx-auto">Terima kasih. Hasil akan diumumkan di layar bersama — bukan di sini.</p>
      </div>
      <div className="w-full bg-card border border-border-1 rounded-[22px] p-3.5 flex flex-col gap-2 text-left">
        <Row label="Token" value={token} mono />
        <Row label="Stage" value={stageName} />
        <Row label="Tercatat" value={new Date().toLocaleTimeString()} mono />
      </div>
      <div className="text-[11.5px] text-fainter">Anda dapat menutup halaman ini.</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-xs text-faint flex-1">{label}</span>
      <span className={`text-xs text-ink ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function ClosedScreen({ eventName, publicId }: { eventName: string; publicId: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-5 text-center bg-border-5 rounded-b-[26px]">
      <div className="w-14 h-14 rounded-full bg-border-2 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C76A0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10.5" width="16" height="10" rx="2"></rect>
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path>
        </svg>
      </div>
      <div>
        <h2 className="m-0 mb-2 text-xl font-semibold tracking-tight text-ink">Acara ini telah ditutup</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[28ch] mx-auto">Pendaftaran dan pemilihan untuk {eventName} sudah tidak dibuka.</p>
      </div>
      <div className="font-mono text-[11px] text-fainter">{publicId} · DITUTUP</div>
    </div>
  );
}
