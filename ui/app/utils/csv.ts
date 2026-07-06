/**
 * Escape a field value for CSV format.
 * Wraps in quotes and escapes internal quotes if the value contains
 * commas, quotes, or newlines.
 */
export function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Convert an array of records to CSV string.
 * First row is the header derived from the keys of the first record.
 * Returns an empty string for empty record sets.
 */
export function recordsToCSV(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "";

  const headers = Object.keys(records[0]);
  const headerRow = headers.map(escapeCSVField).join(",");

  const dataRows = records.map((record) => {
    const values = headers.map((h) => {
      const val: unknown = record[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return escapeCSVField(JSON.stringify(val));
      return escapeCSVField(typeof val === "string" ? val : JSON.stringify(val));
    });
    return values.join(",");
  });

  return [headerRow, ...dataRows].join("\n") + "\n";
}
