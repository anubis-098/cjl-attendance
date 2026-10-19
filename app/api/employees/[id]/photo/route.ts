import { guard, currentSession } from "@/lib/auth";
import { employeeDB } from "@/lib/database";
import { evidenceContentType, EVIDENCE_MAX_SIZE } from "@/lib/attendance-evidence";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function ensureTable() {
  await employeeDB.query(`CREATE TABLE IF NOT EXISTS employee_profiles (
    employee_id text PRIMARY KEY REFERENCES employee_master(employee_id) ON DELETE CASCADE,
    photo bytea NOT NULL,
    content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
    filename text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
  )`);
}
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard(false, false, true);
  if (denied) return denied;
  const { id } = await context.params;
  const account = await currentSession();
  if (account?.role === "employee" && account.employeeId !== id) return new Response(null, { status: 403 });
  try {
    await ensureTable();
    const { rows: [row] } = await employeeDB.query("SELECT photo,content_type FROM employee_profiles WHERE employee_id=$1", [id]);
    if (!row) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(row.photo, { headers: { "Content-Type": row.content_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503 }); }
}
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    if (Number(request.headers.get("content-length")) > EVIDENCE_MAX_SIZE + 65536) return Response.json({ error: "รูปต้องมีขนาดไม่เกิน 5 MB" }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > EVIDENCE_MAX_SIZE) throw Error("เลือกรูปขนาดไม่เกิน 5 MB");
    const photo = Buffer.from(await file.arrayBuffer());
    const contentType = evidenceContentType(photo);
    if (!contentType.startsWith("image/")) throw Error("รองรับเฉพาะ JPG, PNG หรือ WebP");
    const filename = file.name.split(/[\\/]/).at(-1)!.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200);
    await ensureTable();
    const exists = await employeeDB.query("SELECT 1 FROM employee_master WHERE employee_id=$1", [id]);
    if (!exists.rowCount) return Response.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    await employeeDB.query(`INSERT INTO employee_profiles(employee_id,photo,content_type,filename) VALUES($1,$2,$3,$4)
      ON CONFLICT(employee_id) DO UPDATE SET photo=EXCLUDED.photo,content_type=EXCLUDED.content_type,filename=EXCLUDED.filename,updated_at=now()`, [id, photo, contentType, filename]);
    return Response.json({ ok: true, version: randomUUID() });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ" }, { status: 400 }); }
}
export const POST = PUT;
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    await ensureTable();
    await employeeDB.query("DELETE FROM employee_profiles WHERE employee_id=$1", [id]);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "ลบรูปไม่สำเร็จ" }, { status: 400 }); }
}
