/**
 * A small, dependency-free CSV/JSONL writer — consistent with this
 * codebase's existing "hand-rolled over a dependency" convention (see
 * src/domain/rise/csvParser.ts's own stated rationale). RFC 4180-style
 * escaping: a field containing a comma, double quote, or newline is
 * wrapped in double quotes with internal quotes doubled.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serializes `rows` to CSV with a header row, using EXACTLY `columns` (in that order) regardless of what other properties a row object might carry — this is what guarantees stable, documented field ordering (requirement 5: "explicitly define how field ordering... [is] serialized") rather than depending on object key insertion order. */
export function toCsv<T extends object>(rows: readonly T[], columns: readonly (keyof T & string)[]): string {
  const header = columns.map(escapeCsvField).join(",");
  const lines = rows.map((row) => columns.map((col) => escapeCsvField((row as Record<string, unknown>)[col])).join(","));
  return [header, ...lines].map((line) => `${line}\r\n`).join("");
}

/** One JSON object per line — used where flattening to CSV would lose nested trace detail (requirement 6.E: "preserve complete nested traces in JSON/JSONL artifacts when flattening them into CSV would lose essential information"). */
export function toJsonl<T>(rows: readonly T[]): string {
  return rows.map((row) => `${JSON.stringify(row)}\n`).join("");
}
