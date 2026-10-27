/**
 * A small, correct RFC 4180 CSV parser (quoted fields, embedded commas,
 * escaped `""` double-quotes, and newlines inside quoted fields). Written
 * by hand rather than adding a dependency — see validateDomainModel.ts for
 * the same "plain TypeScript over a library" rationale in this codebase.
 *
 * Only handles what the RISE canonical CSVs actually use: comma-delimited,
 * `"` quoting, `\n`/`\r\n` row separators, UTF-8. Does not attempt to
 * support alternate delimiters or dialects.
 */

/** Parses a full CSV document into an array of string rows (each row an array of field strings). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  function endField() {
    row.push(field);
    field = "";
  }
  function endRow() {
    endField();
    rows.push(row);
    row = [];
  }

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      endField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      // swallow; handle \r\n and bare \r as a row break on the following \n check or here
      if (text[i + 1] === "\n") {
        i += 1;
        continue;
      }
      endRow();
      i += 1;
      continue;
    }
    if (c === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // final field/row (if the file doesn't end with a trailing newline)
  if (field.length > 0 || row.length > 0) {
    endRow();
  }
  return rows;
}

/** Parses a CSV document into an array of objects keyed by the header row. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((r) => !(r.length === 1 && r[0] === "")) // skip trailing blank row
    .map((r) => {
      const record: Record<string, string> = {};
      header.forEach((col, idx) => {
        record[col] = r[idx] ?? "";
      });
      return record;
    });
}
