/**
 * Minimal Mailjet Send API v3.1 client (https://dev.mailjet.com/email/guides/send-api-v31/).
 * Uses fetch + Basic auth so no extra dependency is needed. Never throws — every
 * result is returned so callers can surface partial failures in the UI.
 */

const API_URL = "https://api.mailjet.com/v3.1/send";
const MAX_PER_REQUEST = 50; // Mailjet caps a single call at 50 messages

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
  const apiKey = process.env.MAILJET_API_KEY?.trim();
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim();
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim();
  const fromName = process.env.MAILJET_FROM_NAME?.trim() || "Suara";
  return { apiKey, secretKey, fromEmail, fromName };
}

export function isMailjetConfigured(): boolean {
  const { apiKey, secretKey, fromEmail } = config();
  return Boolean(apiKey && secretKey && fromEmail);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function sendEmails(emails: OutgoingEmail[]): Promise<SendReport> {
  const { apiKey, secretKey, fromEmail, fromName } = config();
  if (!apiKey || !secretKey || !fromEmail) {
    return { ok: false, configured: false, sent: 0, failed: [], error: "Mailjet belum dikonfigurasi." };
  }
  if (!emails.length) return { ok: true, configured: true, sent: 0, failed: [] };

  const auth = "Basic " + Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const failed: SendReport["failed"] = [];
  let sent = 0;

  for (const batch of chunk(emails, MAX_PER_REQUEST)) {
    const body = {
      Messages: batch.map((e) => ({
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: e.to, Name: e.toName || e.to }],
        Subject: e.subject,
        TextPart: e.text,
        HTMLPart: e.html,
      })),
    };

    let json: { Messages?: { Status?: string; To?: { Email?: string }[]; Errors?: { ErrorMessage?: string }[] }[] };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      json = await res.json().catch(() => ({}));
      if (!res.ok && !json.Messages) {
        for (const e of batch) failed.push({ to: e.to, error: `Mailjet HTTP ${res.status}` });
        continue;
      }
    } catch (err) {
      for (const e of batch) failed.push({ to: e.to, error: err instanceof Error ? err.message : "Network error" });
      continue;
    }

    const results = json.Messages ?? [];
    batch.forEach((e, i) => {
      const r = results[i];
      if (r?.Status === "success") sent++;
      else failed.push({ to: e.to, error: r?.Errors?.[0]?.ErrorMessage || "Gagal terkirim" });
    });
  }

  return { ok: failed.length === 0, configured: true, sent, failed };
}
