/**
 * Normalise a free-text field for comparison: trim, collapse internal runs of
 * whitespace to a single space, lower-case. Used to match uploaded candidate
 * rows against credential/participant records by `Nama` / `Jemaat`.
 */
export function normKey(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Combined `Nama + Jemaat` comparison key. */
export function namaJemaatKey(name: string | null | undefined, jemaat: string | null | undefined): string {
  return `${normKey(name)}||${normKey(jemaat)}`;
}
