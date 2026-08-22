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

export function parseCredentialsCsv(text: string): { name: string; jemaat: string }[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.findIndex((h) => h === "nama" || h === "name");
  const jemaatIdx = header.findIndex((h) => h === "jemaat");
  if (nameIdx === -1 || jemaatIdx === -1) {
    throw new Error('CSV must have "Nama" and "Jemaat" columns.');
  }

  return rows
    .slice(1)
    .map((r) => ({ name: (r[nameIdx] ?? "").trim(), jemaat: (r[jemaatIdx] ?? "").trim() }))
    .filter((r) => r.name.length > 0);
}
