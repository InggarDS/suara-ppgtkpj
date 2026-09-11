import type { OutgoingEmail } from "@/lib/email";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const BRAND = "PPGT Klasis Pulau Jawa";
const BLUE = "#1b4de4";
// Served from R2 — always a stable public https URL, so unlike the old
// same-origin logo it works regardless of NEXT_PUBLIC_APP_URL (dev, preview,
// localhost, ...). Override with EMAIL_LOGO_URL if the asset ever moves.
const LOGO_URL =
  process.env.EMAIL_LOGO_URL?.trim() ||
  "https://pub-59955eacc4fb431a8fd35d1d0d97ab2f.r2.dev/images/icons/ppgt-logo.png";

function headerHtml(): string {
  return `<div style="text-align:center;margin:0 0 20px">
    <img src="${LOGO_URL}" alt="PPGT" width="56" height="56" style="display:inline-block;width:56px;height:56px;border:0;outline:none;text-decoration:none;border-radius:14px" />
    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5a6690;margin-top:10px">${escapeHtml(BRAND)}</div>
  </div>`;
}

function tokenBlockHtml(token: string): string {
  return `<div style="text-align:center;margin:26px 0 4px">
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8b95b8;margin-bottom:12px">Token Anda</div>
    <div class="token-value" style="display:inline-block;max-width:100%;box-sizing:border-box;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;
                letter-spacing:.16em;color:${BLUE};background:#eaf0ff;border:1px solid rgba(27,77,228,.28);
                border-radius:16px;padding:18px 30px;word-break:break-all">${escapeHtml(token)}</div>
  </div>`;
}

/**
 * Table-free, single-column layout with no fixed widths — it already reflows
 * on a narrow viewport. The `<style>` block layers on top for clients that
 * honor it (Apple/iOS Mail, most webmail, Outlook mobile): a real @media
 * breakpoint tightens padding, shrinks the token, and makes the CTA a
 * full-width tap target. Clients that strip <style> (some Outlook desktop
 * builds) just keep the inline-style desktop layout, which still fits fine.
 */
function shell(inviteUrl: string, inner: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(BRAND)}</title>
<style>
  body { margin: 0; }
  @media only screen and (max-width: 480px) {
    .email-wrap { padding: 20px 14px !important; }
    .email-card { padding: 22px 16px !important; border-radius: 14px !important; }
    .token-value { font-size: 24px !important; padding: 14px 18px !important; letter-spacing: .1em !important; }
    .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
  }
</style>
</head>
<body style="margin:0;background:#eef1fb;font-family:Arial,Helvetica,sans-serif;color:#0a1a4f">
  <div class="email-wrap" style="max-width:540px;margin:0 auto;padding:32px 20px;box-sizing:border-box">
    ${headerHtml()}
    <div class="email-card" style="background:#ffffff;border:1px solid #e6eaf7;border-radius:18px;padding:30px 28px;box-sizing:border-box">
      ${inner}
    </div>
    <p style="text-align:center;font-size:11px;color:#8b95b8;margin:16px 0 0">${escapeHtml(BRAND)} · Suara Kita Untuk Pelayanan</p>
  </div>
</body>
</html>`;
}

/** The token-invite email sent to a participant. */
export function buildTokenEmail(input: {
  eventName: string;
  recipientName?: string | null;
  token: string;
  inviteUrl: string;
}): OutgoingEmail & { to: string } {
  const name = input.recipientName?.trim() || "Peserta";
  const { eventName, token, inviteUrl } = input;

  const text = [
    `Halo ${name},`,
    ``,
    `Berikut token pribadi Anda untuk mengikuti pemungutan suara "${eventName}".`,
    ``,
    `Token: ${token}`,
    ``,
    `Buka tautan berikut, lalu masukkan token di atas untuk mendaftar:`,
    inviteUrl,
    ``,
    `Token ini bersifat pribadi — jangan dibagikan kepada orang lain.`,
    ``,
    `Salam,`,
    `Panitia ${eventName}`,
  ].join("\n");

  const inner = `<p style="margin:0 0 14px;font-size:14px">Halo <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 4px;font-size:14px;line-height:1.7">
        Berikut token pribadi Anda untuk mengikuti pemungutan suara
        <strong>${escapeHtml(eventName)}</strong>.
      </p>
      ${tokenBlockHtml(token)}
      <p style="margin:20px 0 16px;font-size:14px;line-height:1.7">
        Buka tautan di bawah ini, lalu masukkan token di atas untuk mendaftar:
      </p>
      <p style="text-align:center;margin:0 0 18px">
        <a href="${escapeHtml(inviteUrl)}" class="cta-button"
           style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;
                  font-weight:600;font-size:14px;border-radius:999px;padding:14px 28px;text-align:center">Buka Halaman Pendaftaran</a>
      </p>
      <p style="margin:0;font-size:12px;color:#5a6690;line-height:1.7">
        Token ini bersifat pribadi — jangan dibagikan kepada orang lain.
      </p>`;

  return {
    to: "",
    subject: `Token Anda untuk ${eventName}`,
    text,
    html: shell(inviteUrl, inner),
  };
}
