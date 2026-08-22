import { parseCredentialsCsv, rowsToCredentials } from "@/lib/csv";

export async function parseCredentialsFile(file: File): Promise<{ name: string; jemaat: string }[]> {
  const isXlsx = /\.xlsx?$/i.test(file.name) || file.type.includes("spreadsheet") || file.type.includes("ms-excel");

  if (isXlsx) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    return rowsToCredentials(rows);
  }

  const text = await file.text();
  return parseCredentialsCsv(text);
}
