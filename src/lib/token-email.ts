import type { OutgoingEmail } from "@/lib/email";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Placeholders an admin can use in a custom token-email template. Case-insensitive,
 * square brackets — e.g. `Berikut token untuk [nama]: [token]`.
 */
export const EMAIL_PLACEHOLDERS = ["nama", "jemaat", "token", "acara", "link"] as const;

function fillPlaceholders(tpl: string, values: Record<(typeof EMAIL_PLACEHOLDERS)[number], string>): string {
  return tpl.replace(/\[(nama|jemaat|token|acara|link)\]/gi, (_m, key: string) => values[key.toLowerCase() as keyof typeof values]);
}

type BuildInput = {
  eventName: string;
  recipientName?: string | null;
  recipientJemaat?: string | null;
  token: string;
  inviteUrl: string;
  /** Custom template — when both are set, they replace the built-in copy. */
  subjectTemplate?: string | null;
  bodyTemplate?: string | null;
};

const BRAND = "PPGT Klasis Pulau Jawa";
const BLUE = "#1b4de4";

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/** Centered logo + brand line at the top of the email. */
function headerHtml(inviteUrl: string): string {
  const origin = originOf(inviteUrl);
  const logo = origin
    ? `<img src="${origin}/ppgt-logo.png" alt="PPGT" width="60" height="60" style="display:inline-block;border:0;outline:none;text-decoration:none" />`
    : "";
  return `<div style="text-align:center;margin:0 0 20px">
    ${logo}
    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5a6690;margin-top:${logo ? "10px" : "0"}">${escapeHtml(BRAND)}</div>
  </div>`;
}

/** The big, centered token block. */
function tokenBlockHtml(token: string): string {
  return `<div style="text-align:center;margin:26px 0 4px">
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8b95b8;margin-bottom:12px">Token Anda</div>
    <div style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;
                letter-spacing:.16em;color:${BLUE};background:#eaf0ff;border:1px solid rgba(27,77,228,.28);
                border-radius:16px;padding:18px 30px">${escapeHtml(token)}</div>
  </div>`;
}

function shell(inviteUrl: string, inner: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#eef1fb;font-family:Arial,Helvetica,sans-serif;color:#0a1a4f">
  <div style="max-width:540px;margin:0 auto;padding:32px 20px">
    ${headerHtml(inviteUrl)}
    <div style="background:#ffffff;border:1px solid #e6eaf7;border-radius:18px;padding:30px 28px">
      ${inner}
    </div>
    <p style="text-align:center;font-size:11px;color:#8b95b8;margin:16px 0 0">${escapeHtml(BRAND)} · Suara Kita Untuk Pelayanan</p>
  </div>
</body></html>`;
}

/** The token-invite email sent to a participant. */
export function buildTokenEmail(input: BuildInput): OutgoingEmail & { to: string } {
  const name = input.recipientName?.trim() || "Peserta";
  const jemaat = input.recipientJemaat?.trim() || "-";
  const { eventName, token, inviteUrl } = input;

  const subjectTpl = input.subjectTemplate?.trim();
  const bodyTpl = input.bodyTemplate?.trim();

  // --- custom template path -------------------------------------------------
  if (bodyTpl) {
    const plain = { nama: name, jemaat, token, acara: eventName, link: inviteUrl };
    const subject = subjectTpl ? fillPlaceholders(subjectTpl, plain) : `Token Anda untuk ${eventName}`;
    const filledText = fillPlaceholders(bodyTpl, plain);
    const hasToken = /\[token\]/i.test(bodyTpl);

    // Escape the admin's copy first, then swap placeholders for styled fragments.
    const bold = (v: string) => `<strong>${escapeHtml(v)}</strong>`;
    const tokenChip = `<span style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:20px;
                        font-weight:700;letter-spacing:.12em;color:${BLUE};background:#eaf0ff;
                        border:1px solid rgba(27,77,228,.28);border-radius:9px;padding:3px 12px">${escapeHtml(token)}</span>`;
    const filledBody = fillPlaceholders(escapeHtml(bodyTpl), {
      nama: bold(name),
      jemaat: bold(jemaat),
      acara: bold(eventName),
      token: tokenChip,
      link: `<a href="${escapeHtml(inviteUrl)}" style="color:${BLUE};font-weight:600">${escapeHtml(inviteUrl)}</a>`,
    });

    const inner = `<div style="font-size:14px;line-height:1.9;white-space:pre-wrap">${filledBody}</div>
      ${hasToken ? "" : tokenBlockHtml(token)}`;
    return { to: "", subject, text: filledText, html: shell(inviteUrl, inner) };
  }

  // --- built-in default --------------------------------------------------------
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
        <a href="${escapeHtml(inviteUrl)}"
           style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;
                  font-weight:600;font-size:14px;border-radius:999px;padding:12px 28px">Buka Halaman Pendaftaran</a>
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
