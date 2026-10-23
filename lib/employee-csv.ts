import { MASTER_HEADERS } from "./source-headers";

export function employeeMasterCsv(rows: { source_data: Record<string, unknown> }[]) {
  const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [
    MASTER_HEADERS.map(csvCell).join(","),
    ...rows.map(row => MASTER_HEADERS.map(header => csvCell(row.source_data?.[header])).join(",")),
  ].join("\r\n");
}
