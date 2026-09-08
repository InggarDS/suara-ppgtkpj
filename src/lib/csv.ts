export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export type CredentialRow = { name: string; jemaat: string; email: string };

export function rowsToCredentials(rows: unknown[][]): CredentialRow[] {
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const nameIdx = header.findIndex((h) => h === "nama" || h === "name");
  const jemaatIdx = header.findIndex((h) => h === "jemaat");
  const emailIdx = header.findIndex((h) => h === "email" || h === "e-mail" || h === "surel");
  if (nameIdx === -1 || jemaatIdx === -1) {
    throw new Error('File must have "Nama" and "Jemaat" columns.');
  }

  return rows
    .slice(1)
    .map((r) => ({
      name: String(r[nameIdx] ?? "").trim(),
      jemaat: String(r[jemaatIdx] ?? "").trim(),
      email: emailIdx === -1 ? "" : String(r[emailIdx] ?? "").trim(),
    }))
    .filter((r) => r.name.length > 0);
}

export function parseCredentialsCsv(text: string): CredentialRow[] {
  return rowsToCredentials(parseCsv(text));
}
