import { customAlphabet } from "nanoid";

const digits = customAlphabet("0123456789", 4);
const tokenAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

export async function nextPublicEventId(count: number) {
  return "evt_" + String(count + 1).padStart(3, "0");
}

export function generateToken(prefix = "TOK-", suffix = "") {
  return `${prefix}${digits()}${suffix}`;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function randomTokenAlt() {
  return tokenAlphabet();
}
