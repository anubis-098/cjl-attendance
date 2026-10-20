import { guard } from "@/lib/auth";
import { employeeDB, fingerprintDB } from "@/lib/database";
import { EMPLOYEE_FILTERS, employeeFilterValue } from "@/lib/employee-filters";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await guard(false, false);
  if (denied) return denied;
  try {
    const p = new URL(request.url).searchParams,
      page = Math.max(1, Number(p.get("page")) || 1),
      search = p.get("search") || "",
      type = p.get("type");
    if (type === "employees") {
      const distinct = await employeeDB.query<{ key: string; value: string }>(
        `SELECT DISTINCT field.key, field.value
         FROM employee_master CROSS JOIN LATERAL jsonb_each_text(source_data::jsonb) AS field
         WHERE field.key = ANY($1::text[])`,
        [EMPLOYEE_FILTERS.map((filter) => filter.header)],
      );
      const options: Record<string, string[]> = {};
      const args: unknown[] = [`%${search}%`];
      const conditions = [
        "(employee_id ILIKE $1 OR source_data::text ILIKE $1)",
      ];
      for (const filter of EMPLOYEE_FILTERS) {
        const values = distinct.rows.filter((row) => row.key === filter.header);
        options[filter.key] = [
          ...new Set(
            values.map((row) => employeeFilterValue(filter.key, row.value)),
          ),
        ].sort((a, b) => a.localeCompare(b, "th"));
        const selected = p.get(filter.key);
        if (selected !== null) {
          const rawValues = values
            .filter(
              (row) => employeeFilterValue(filter.key, row.value) === selected,
            )
            .map((row) => row.value);
          args.push(filter.header, rawValues);
          conditions.push(
            `source_data->>$${args.length - 1} = ANY($${args.length}::text[])`,
          );
        }
      }
      if (p.get("review") === "ready")
        conditions.push("COALESCE(issue, '') = ''");
      if (p.get("review") === "issue")
        conditions.push("COALESCE(issue, '') <> ''");
      const where = conditions.join(" AND ");
      const count = await employeeDB.query(
        `SELECT count(*) FROM employee_master WHERE ${where}`,
        args,
      );
      const rows = await employeeDB.query(
        `SELECT * FROM employee_master WHERE ${where} ORDER BY source_row LIMIT 25 OFFSET $${args.length + 1}`,
        [...args, (page - 1) * 25],
      );
      return Response.json({
        rows: rows.rows,
        total: Number(count.rows[0].count),
        options,
      });
    }
    const args = [`%${search}%`];
    const fingerprintPageSize = 10;
    const count = await fingerprintDB.query(
      "SELECT count(*) FROM (SELECT DISTINCT employee_id,punch_timestamp,punch_type FROM fingerprint_logs WHERE employee_id ILIKE $1) scans",
      args,
    );
    const rows = await fingerprintDB.query(
      "SELECT employee_id,to_char(punch_timestamp,'YYYYMMDD') AS scan_date,to_char(punch_timestamp,'HH24MI') AS scan_time FROM (SELECT DISTINCT employee_id,punch_timestamp,punch_type FROM fingerprint_logs WHERE employee_id ILIKE $1) scans ORDER BY punch_timestamp,employee_id,punch_type LIMIT $2 OFFSET $3",
      [...args, fingerprintPageSize, (page - 1) * fingerprintPageSize],
    );
    return Response.json({
      rows: rows.rows,
      total: Number(count.rows[0].count),
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "อ่านฐานข้อมูลไม่ได้" }, { status: 503 });
  }
}
