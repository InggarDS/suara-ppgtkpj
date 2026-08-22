"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { compressImage } from "@/lib/compress-image";
import { initials } from "@/lib/ids";
import { parseDeviceLabel } from "@/lib/device";

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
    allowAbstain: boolean;
    candidates: { id: string; name: string; note: string; photo: string | null }[];
  } | null;
  totalStages: number;
  valid?: boolean;
  registered?: boolean;
  name?: string | null;
  token?: string;
  votedLiveStage?: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

  useEffect(() => {
    // Reading localStorage requires the client; this mount-only sync is the standard escape hatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient({ hydrated: true, deviceId: getDeviceId(), token: localStorage.getItem(`suara_token_${publicId}`) });
  }, [publicId]);

  const stateUrl = hydrated
    ? `/api/public/events/${publicId}/state${token ? `?token=${encodeURIComponent(token)}` : ""}`
    : null;
  const { data, mutate } = useSWR<StateResp>(stateUrl, fetcher, { refreshInterval: 3000 });

  function handleRegistered(tok: string) {
    localStorage.setItem(`suara_token_${publicId}`, tok);
    setToken(tok);
    mutate();
  }

  let screen: "loading" | "register" | "closed" | "waiting" | "booth" | "done" = "loading";
  if (data) {
    if (data.closed) screen = "closed";
    else if (!token || data.valid === false) screen = "register";
    else if (data.liveStage && !data.votedLiveStage) screen = "booth";
    else if (data.liveStage && data.votedLiveStage) screen = "done";
    else screen = "waiting";
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-start sm:items-center justify-center py-8 px-4">
      <div className="w-full max-w-[420px] bg-paper rounded-[26px] shadow-sm border border-border-1 min-h-[600px] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-6 pt-5 pb-1">
          <div className="w-[22px] h-[22px] rounded-[6px] bg-brand flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 9.5 18 20 6.5"></path>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-ink">Suara</span>
        </div>

        {screen === "loading" && <div className="flex-1 flex items-center justify-center text-sm text-faint">Loading…</div>}
        {screen === "register" && (
          <RegisterScreen
            publicId={publicId}
            eventName={eventName}
            bannerImage={data?.bannerImage ?? null}
            useCredentials={data?.useCredentials ?? false}
            deviceId={deviceId}
            onDone={handleRegistered}
          />
        )}
        {screen === "closed" && <ClosedScreen eventName={eventName} publicId={publicId} />}
        {screen === "waiting" && data && (
          <WaitingScreen name={data.name ?? ""} token={data.token ?? ""} totalStages={data.totalStages} />
        )}
        {screen === "booth" && data?.liveStage && token && (
          <BoothScreen publicId={publicId} token={token} stage={data.liveStage} totalStages={data.totalStages} onVoted={() => mutate()} />
        )}
        {screen === "done" && data && <DoneScreen token={data.token ?? ""} stageName={data.liveStage?.name ?? ""} />}
      </div>
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
}: {
  publicId: string;
  eventName: string;
  bannerImage: string | null;
  useCredentials: boolean;
  deviceId: string;
  onDone: (token: string) => void;
}) {
  const [name, setName] = useState("");
  const [jemaat, setJemaat] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [credentialMatch, setCredentialMatch] = useState<"idle" | "checking" | "found" | "not-found">("idle");

  useEffect(() => {
    if (!useCredentials) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const handle = setTimeout(async () => {
      setCredentialMatch("checking");
      const res = await fetch(`/api/public/events/${publicId}/credential-lookup?name=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (json.found) {
        setCredentialMatch("found");
        setJemaat(json.jemaat);
      } else {
        setCredentialMatch("not-found");
        setJemaat("");
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [name, publicId, useCredentials]);

  const effectiveCredentialMatch = name.trim() ? credentialMatch : "idle";
  const displayJemaat = name.trim() ? jemaat : "";

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(undefined);
    if (useCredentials) {
      if (!name.trim()) {
        setError("Enter your name.");
        return;
      }
      if (credentialMatch !== "found") {
        setError("Nama tidak sesuai kredensi");
        return;
      }
    } else if (!name.trim() || !jemaat.trim() || !tokenInput.trim()) {
      setError("Enter your name, jemaat and personal token.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/public/events/${publicId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: useCredentials ? undefined : tokenInput.trim(),
          name: name.trim(),
          jemaat: useCredentials ? undefined : jemaat.trim(),
          photo,
          deviceId,
          deviceLabel: parseDeviceLabel(navigator.userAgent),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Registration failed.");
        return;
      }
      onDone(json.token);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col gap-5 pb-6.5">
      {bannerImage && (
        <img src={bannerImage} alt="" className="w-full h-36 object-cover flex-none" />
      )}
      <div className={bannerImage ? "px-6" : "px-6 pt-3.5"}>
        <div className="font-mono text-[10px] tracking-[.1em] text-faint uppercase mb-2">{publicId}</div>
        <h2 className="m-0 mb-1.5 text-2xl font-semibold tracking-tight text-ink leading-tight text-pretty">{eventName}</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body">
          {useCredentials
            ? "Register once to receive your ballot. Enter your name exactly as registered with the committee."
            : "Register once to receive your ballot. Your token was sent with your invitation."}
        </p>
      </div>

      <div className="flex flex-col gap-3.5 px-6">
        <div>
          <label className="block text-xs font-medium text-body mb-1.5">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Inggar Saputra"
            className={`w-full border rounded-[11px] px-3.5 py-3.5 text-[15px] text-ink bg-white outline-none focus:border-brand ${
              useCredentials && effectiveCredentialMatch === "not-found" ? "border-danger" : "border-border-1"
            }`}
          />
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
            placeholder={useCredentials ? "Auto-filled after name matches" : "e.g. Jemaat KPJ"}
            className={`w-full border border-border-1 rounded-[11px] px-3.5 py-3.5 text-[15px] text-ink outline-none focus:border-brand ${
              useCredentials ? "bg-border-5 text-body" : "bg-white"
            }`}
          />
        </div>
        {useCredentials ? (
          <div>
            <label className="block text-xs font-medium text-body mb-1.5">Personal token</label>
            <div className="w-full border border-dashed border-border-2 rounded-[11px] px-3.5 py-3.5 text-[13.5px] text-faint bg-border-5">
              Token di generate otomatis
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-body mb-1.5">Personal token</label>
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="TOK-0000"
              className="w-full border border-border-1 rounded-[11px] px-3.5 py-3.5 font-mono text-[15px] tracking-[.06em] text-ink bg-white outline-none focus:border-brand"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-body mb-1.5">Profile photo</label>
          <label
            className={`flex items-center w-full rounded-[13px] p-3.5 cursor-pointer transition-all ${
              photo ? "bg-[#F3F8F5] border-[1.5px] border-brand-soft-border-2" : "bg-white border-[1.5px] border-dashed border-border-2"
            }`}
          >
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={onPhotoChange} />
            {photo ? (
              <span className="flex items-center gap-3 w-full">
                <img src={photo} alt="" className="w-12 h-12 rounded-xl object-cover flex-none" />
                <span className="flex-1 text-left min-w-0">
                  <span className="block text-[13px] font-medium text-ink">Photo selected</span>
                  <span className="block font-mono text-[11.5px] leading-relaxed text-brand">compressed</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F5F4E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                  <path d="M4 12.5 9.5 18 20 6.5"></path>
                </svg>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1.5 w-full py-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B8880" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"></path>
                </svg>
                <span className="text-[13px] font-medium text-ink-soft">{busy ? "Compressing…" : "Take or upload a photo"}</span>
                <span className="text-[11.5px] text-faint">Compressed to ≤ 500 KB on your phone</span>
              </span>
            )}
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-danger m-0 px-6">{error}</p>}

      <div className="mt-auto flex flex-col gap-2.5 px-6">
        <button
          onClick={submit}
          disabled={busy}
          className="w-full bg-brand text-white rounded-xl py-4 text-[15px] font-semibold cursor-pointer hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "Please wait…" : "Register"}
        </button>
        <p className="m-0 text-[11.5px] leading-relaxed text-faint text-center">One device, one token, one vote per stage.</p>
      </div>
    </div>
  );
}

function WaitingScreen({ name, token, totalStages }: { name: string; token: string; totalStages: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-6.5 text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <span className="absolute w-16 h-16 rounded-full border-[1.5px] border-brand animate-ring" />
        <span className="w-3 h-3 rounded-full bg-brand animate-pulse-dot" />
      </div>
      <div>
        <h2 className="m-0 mb-2 text-[22px] font-semibold tracking-tight text-ink">Voting hasn&apos;t started</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[26ch] mx-auto">This screen updates on its own. Keep it open — no need to refresh.</p>
      </div>
      <div className="w-full bg-white border border-border-1 rounded-[13px] p-3.5 flex items-center gap-3 text-left">
        <span className="w-10.5 h-10.5 rounded-[11px] bg-border-4 text-body text-[13px] font-semibold flex items-center justify-center flex-none">
          {name ? initials(name) : ""}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink">{name}</span>
          <span className="block font-mono text-[11.5px] leading-relaxed text-faint">{token} · registered</span>
        </span>
        <span className="text-[11px] font-medium text-brand bg-brand-soft rounded-md px-2 py-1.5 flex-none">Ready</span>
      </div>
      <div className="font-mono text-[11.5px] text-fainter">{totalStages} stage{totalStages === 1 ? "" : "s"} configured</div>
    </div>
  );
}

function BoothScreen({
  publicId,
  token,
  stage,
  totalStages,
  onVoted,
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
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [abstain, setAbstain] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!choice && !abstain) return;
    setBusy(true);
    try {
      await fetch(`/api/public/events/${publicId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, candidateId: choice ?? undefined, abstain }),
      });
      onVoted();
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(choice || abstain);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-3 pb-3.5 border-b border-border-4 flex-none">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10px] tracking-[.1em] text-brand uppercase">
            Stage {stage.order} of {totalStages}
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
              onClick={() => {
                setChoice(c.id);
                setAbstain(false);
              }}
              className={`flex items-center gap-3.5 w-full p-3.5 rounded-2xl cursor-pointer text-left transition-all bg-white ${
                on ? "border-[1.5px] border-brand shadow-[0_0_0_3px_rgba(31,95,78,.1)]" : "border-[1.5px] border-border-1"
              }`}
            >
              {c.photo ? (
                <img src={c.photo} alt="" className="w-11.5 h-11.5 rounded-full object-cover flex-none" />
              ) : (
                <span
                  className={`w-11.5 h-11.5 rounded-full flex-none flex items-center justify-center text-[13px] font-semibold ${
                    on ? "bg-[#DCE8E1] text-brand" : "bg-border-4 text-faint"
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
            onClick={() => {
              setAbstain(true);
              setChoice(null);
            }}
            className={`flex items-center gap-3.5 w-full p-3.5 rounded-2xl cursor-pointer text-left transition-all bg-white ${
              abstain ? "border-[1.5px] border-brand shadow-[0_0_0_3px_rgba(31,95,78,.1)]" : "border-[1.5px] border-border-1"
            }`}
          >
            <span className="flex-1 text-[15px] font-semibold text-ink">Golput (abstain)</span>
            <span className={`w-5 h-5 rounded-full flex-none ${abstain ? "border-[6px] border-brand" : "border-[1.5px] border-border-2"}`} />
          </button>
        )}

        <div className="flex gap-2 items-start pt-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A3A099" strokeWidth="1.7" strokeLinecap="round" className="flex-none mt-0.5">
            <path d="M12 3 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-4Z"></path>
          </svg>
          <span className="text-[11.5px] leading-relaxed text-faint">Your ballot is anonymous. Only the fact that you voted is recorded against your token.</span>
        </div>
      </div>

      <div className="flex-none px-6 pt-3.5 pb-6.5 border-t border-border-4 bg-paper">
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className={`w-full rounded-xl py-4 text-[15px] font-semibold border-none transition-colors ${
            canSubmit ? "bg-brand text-white cursor-pointer hover:bg-brand-hover" : "bg-border-4 text-fainter cursor-not-allowed"
          }`}
        >
          {busy ? "Submitting…" : canSubmit ? "Submit vote" : "Select a candidate"}
        </button>
      </div>
    </div>
  );
}

function DoneScreen({ token, stageName }: { token: string; stageName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6.5 py-6.5 gap-5.5 text-center">
      <div className="w-[66px] h-[66px] rounded-full bg-brand-soft flex items-center justify-center animate-rise-in">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1F5F4E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9.5 18 20 6.5"></path>
        </svg>
      </div>
      <div>
        <h2 className="m-0 mb-2 text-[23px] font-semibold tracking-tight text-ink">Vote recorded</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[28ch] mx-auto">Thank you. Results are announced on the shared screen — not here.</p>
      </div>
      <div className="w-full bg-white border border-border-1 rounded-[13px] p-3.5 flex flex-col gap-2 text-left">
        <Row label="Token" value={token} mono />
        <Row label="Stage" value={stageName} />
        <Row label="Recorded" value={new Date().toLocaleTimeString()} mono />
      </div>
      <div className="text-[11.5px] text-fainter">You can close this page.</div>
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B8880" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10.5" width="16" height="10" rx="2"></rect>
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path>
        </svg>
      </div>
      <div>
        <h2 className="m-0 mb-2 text-xl font-semibold tracking-tight text-ink">This event is closed</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-body max-w-[28ch] mx-auto">Registration and voting for {eventName} are no longer open.</p>
      </div>
      <div className="font-mono text-[11px] text-fainter">{publicId} · CLOSED</div>
    </div>
  );
}
