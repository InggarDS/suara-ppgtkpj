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

/** The token-invite email sent to a participant. */
export function buildTokenEmail(input: BuildInput): OutgoingEmail & { to: string } {
  const name = input.recipientName?.trim() || "Peserta";
  const jemaat = input.recipientJemaat?.trim() || "-";
  const { eventName, token, inviteUrl } = input;

  const subjectTpl = input.subjectTemplate?.trim();
  const bodyTpl = input.bodyTemplate?.trim();

  // --- custom template path -------------------------------------------------
  if (bodyTpl) {
    const values = { nama: name, jemaat, token, acara: eventName, link: inviteUrl };
    const subject = subjectTpl ? fillPlaceholders(subjectTpl, values) : `Token Anda untuk ${eventName}`;
    const filledText = fillPlaceholders(bodyTpl, values);
    const filledHtml = fillPlaceholders(bodyTpl, {
      nama: escapeHtml(name),
      jemaat: escapeHtml(jemaat),
      token: escapeHtml(token),
      acara: escapeHtml(eventName),
      link: escapeHtml(inviteUrl),
    });
    const html = `<!doctype html>
<html><body style="margin:0;background:#eef1fb;font-family:Arial,Helvetica,sans-serif;color:#0a1a4f">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#ffffff;border:1px solid #e6eaf7;border-radius:16px;padding:28px;font-size:14px;line-height:1.7;white-space:pre-wrap">${filledHtml}</div>
  </div>
</body></html>`;
    return { to: "", subject, text: filledText, html };
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

  const html = `<!doctype html>
<html><body style="margin:0;background:#eef1fb;font-family:Arial,Helvetica,sans-serif;color:#0a1a4f">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#ffffff;border:1px solid #e6eaf7;border-radius:16px;padding:28px">
      <p style="margin:0 0 14px;font-size:14px">Halo <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6">
        Berikut token pribadi Anda untuk mengikuti pemungutan suara
        <strong>${escapeHtml(eventName)}</strong>.
      </p>
      <div style="text-align:center;margin:22px 0">
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b95b8;margin-bottom:8px">Token Anda</div>
        <div style="display:inline-block;font-family:'Courier New',monospace;font-size:26px;font-weight:700;
                    letter-spacing:.12em;color:#1b4de4;background:#eaf0ff;border:1px solid rgba(27,77,228,.28);
                    border-radius:12px;padding:14px 22px">${escapeHtml(token)}</div>
      </div>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6">
        Buka tautan di bawah ini, lalu masukkan token di atas untuk mendaftar:
      </p>
      <p style="text-align:center;margin:0 0 20px">
        <a href="${escapeHtml(inviteUrl)}"
           style="display:inline-block;background:#1b4de4;color:#ffffff;text-decoration:none;
                  font-weight:600;font-size:14px;border-radius:999px;padding:12px 26px">Buka Halaman Pendaftaran</a>
      </p>
      <p style="margin:0;font-size:12px;color:#5a6690;line-height:1.6">
        Token ini bersifat pribadi — jangan dibagikan kepada orang lain.
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#8b95b8;margin:16px 0 0">Salam, Panitia ${escapeHtml(eventName)}</p>
  </div>
</body></html>`;

  return {
    to: "",
    subject: `Token Anda untuk ${eventName}`,
    text,
    html,
  };
}
