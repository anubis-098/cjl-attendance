import { guard } from "@/lib/auth";
import { employeeDB } from "@/lib/database";
import { employeeMasterCsv } from "@/lib/employee-csv";
import { EMPLOYEE_FILTERS, employeeFilterValue } from "@/lib/employee-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guard(false, false);
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const filtered = params.get("scope") === "filtered";
    let rows: { source_data: Record<string, unknown> }[];
    if (filtered) {
      const distinct = await employeeDB.query<{ key: string; value: string }>(
        `SELECT DISTINCT field.key, field.value
         FROM employee_master CROSS JOIN LATERAL jsonb_each_text(source_data::jsonb) AS field
         WHERE field.key = ANY($1::text[])`,
        [EMPLOYEE_FILTERS.map((filter) => filter.header)],
      );
      const args: unknown[] = [`%${params.get("search") || ""}%`];
      const conditions = ["(employee_id ILIKE $1 OR source_data::text ILIKE $1)"];
      for (const filter of EMPLOYEE_FILTERS) {
        const selected = params.get(filter.key);
        if (selected === null) continue;
        const rawValues = distinct.rows
          .filter((row) => row.key === filter.header && employeeFilterValue(filter.key, row.value) === selected)
          .map((row) => row.value);
        args.push(filter.header, rawValues);
        conditions.push(`source_data->>$${args.length - 1} = ANY($${args.length}::text[])`);
      }
      if (params.get("review") === "ready") conditions.push("COALESCE(issue, '') = ''");
      if (params.get("review") === "issue") conditions.push("COALESCE(issue, '') <> ''");
      const result = await employeeDB.query<{ source_data: Record<string, unknown> }>(
        `SELECT source_data FROM employee_master WHERE ${conditions.join(" AND ")} ORDER BY source_row,employee_id`,
        args,
      );
      rows = result.rows;
    } else {
      const result = await employeeDB.query<{ source_data: Record<string, unknown> }>(
        "SELECT source_data FROM employee_master ORDER BY source_row,employee_id",
      );
      rows = result.rows;
    }
    const date = new Date().toISOString().slice(0, 10);
    const scope = filtered ? "filtered" : "all";
    return new Response(`\uFEFF${employeeMasterCsv(rows)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="employee_master_${scope}_${date}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "ไม่สามารถส่งออกข้อมูลพนักงานได้" }, { status: 503 });
  }
}
