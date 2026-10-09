import { guard } from "@/lib/auth";
import { employeeDB, updateEmployeeStore } from "@/lib/database";
import {
  evidenceContentType,
  validEvidenceDate,
  EVIDENCE_MAX_SIZE,
} from "@/lib/attendance-evidence";
export const runtime = "nodejs";
const fields =
  "id,filename,content_type,file_size,source,provider_name,note,created_at";
export async function GET(request: Request) {
  const denied = await guard(false, false);
  if (denied) return denied;
  const url = new URL(request.url),
    id = url.searchParams.get("employeeId") || "",
    date = url.searchParams.get("date") || "";
  if (!id || !validEvidenceDate(date))
    return Response.json(
      { error: "พนักงานหรือวันที่ไม่ถูกต้อง" },
      { status: 400 },
    );
  const { rows } = await employeeDB.query(
    `SELECT ${fields} FROM attendance_evidence WHERE employee_id=$1 AND shift_date=$2 ORDER BY created_at,id`,
    [id, date],
  );
  return Response.json(
    { evidence: rows },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    if (
      Number(request.headers.get("content-length")) >
      EVIDENCE_MAX_SIZE + 65536
    )
      return Response.json(
        { error: "ไฟล์ต้องมีขนาดไม่เกิน 5 MB" },
        { status: 413 },
      );
    const form = await request.formData();
    const employeeId = String(form.get("employeeId") || ""),
      date = String(form.get("date") || ""),
      source = String(form.get("source") || ""),
      provider = String(form.get("providerName") || "").trim(),
      note = String(form.get("note") || "").trim(),
      file = form.get("file");
    if (
      !employeeId ||
      employeeId.length > 200 ||
      !validEvidenceDate(date) ||
      !["employee", "supervisor"].includes(source) ||
      provider.length > 200 ||
      note.length > 1000
    )
      throw Error("ข้อมูลหลักฐานไม่ถูกต้อง");
    if (!(file instanceof File) || !file.size || file.size > EVIDENCE_MAX_SIZE)
      throw Error("กรุณาเลือกไฟล์ขนาดไม่เกิน 5 MB");
    const content = Buffer.from(await file.arrayBuffer()),
      contentType = evidenceContentType(content);
    const filename =
      file.name
        .split(/[\\/]/)
        .at(-1)!
        .replace(/[\x00-\x1f\x7f]/g, "")
        .slice(0, 200) || "evidence";
    const id = crypto.randomUUID();
    await updateEmployeeStore(async (c, state) => {
      const employee = await c.query(
        "SELECT employee_id FROM employee_master WHERE employee_id=$1",
        [employeeId],
      );
      if (!employee.rowCount) throw Error("ไม่พบพนักงานใน Master");
      const count = await c.query(
        "SELECT count(*) FROM attendance_evidence WHERE employee_id=$1 AND shift_date=$2",
        [employeeId, date],
      );
      if (Number(count.rows[0].count) >= 10)
        throw Error("แนบหลักฐานได้สูงสุด 10 ไฟล์ต่อวันทำงาน");
      await c.query(
        "INSERT INTO attendance_evidence(id,employee_id,shift_date,filename,content_type,file_size,content,source,provider_name,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          id,
          employeeId,
          date,
          filename,
          contentType,
          file.size,
          content,
          source,
          provider,
          note,
        ],
      );
      const entry = {
        id: crypto.randomUUID(),
        key: `${employeeId}|${date}`,
        actor: "ผู้ใช้งานเว็บ",
        timestamp: new Date().toISOString(),
        reason: "แนบหลักฐานการมาทำงาน",
        before: "",
        after: JSON.stringify({
          evidenceId: id,
          filename,
          source,
          providerName: provider,
          note,
        }),
      };
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [
        JSON.stringify({ ...state.data, audit: [entry, ...state.data.audit] }),
      ]);
    });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error && !("code" in e)
            ? e.message
            : "บันทึกหลักฐานไม่สำเร็จ",
      },
      { status: 400 },
    );
  }
}
