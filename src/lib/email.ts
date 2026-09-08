/**
 * Minimal Resend client (https://resend.com/docs/api-reference/emails/send-email).
 * Uses fetch + a Bearer key so no extra dependency is needed. Never throws —
 * every result is returned so callers can surface partial failures in the UI.
 */

const SEND_URL = "https://api.resend.com/emails";
const BATCH_URL = "https://api.resend.com/emails/batch";
const MAX_PER_BATCH = 100; // Resend's batch endpoint caps at 100 messages

export type OutgoingEmail = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
};

export type SendReport = {
  ok: boolean;
  configured: boolean;
  sent: number;
  failed: { to: string; error: string }[];
  error?: string;
};

function config() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim();
  return { apiKey, fromEmail, fromName };
}

export function isEmailConfigured(): boolean {
  const { apiKey, fromEmail } = config();
  return Boolean(apiKey && fromEmail);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendEmails(emails: OutgoingEmail[]): Promise<SendReport> {
  const { apiKey, fromEmail, fromName } = config();
  if (!apiKey || !fromEmail) {
    return { ok: false, configured: false, sent: 0, failed: [], error: "Email belum dikonfigurasi." };
  }
  if (!emails.length) return { ok: true, configured: true, sent: 0, failed: [] };

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  const failed: SendReport["failed"] = [];
  let sent = 0;

  const batches = chunk(emails, MAX_PER_BATCH);
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const payload = batch.map((e) => ({
      from,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
    }));

    // Single email → /emails (clearer errors); many → /emails/batch.
    const url = payload.length === 1 ? SEND_URL : BATCH_URL;
    const body = JSON.stringify(payload.length === 1 ? payload[0] : payload);

    try {
      const res = await fetch(url, { method: "POST", headers, body, cache: "no-store" });
      if (res.ok) {
        sent += batch.length;
      } else {
        const json = (await res.json().catch(() => ({}))) as { message?: string; error?: { message?: string } };
        const msg = json.message || json.error?.message || `Resend HTTP ${res.status}`;
        for (const e of batch) failed.push({ to: e.to, error: msg });
      }
    } catch (err) {
      for (const e of batch) failed.push({ to: e.to, error: err instanceof Error ? err.message : "Network error" });
    }

    // Resend's default rate limit is 2 requests/second.
    if (b < batches.length - 1) await sleep(600);
  }

  return { ok: failed.length === 0, configured: true, sent, failed };
}
