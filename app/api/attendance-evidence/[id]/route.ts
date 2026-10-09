import { guard } from "@/lib/auth";
import { employeeDB, updateEmployeeStore } from "@/lib/database";
export const runtime = "nodejs";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard(true, true);
  if (denied) return denied;
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return Response.json({ error: "ไม่พบหลักฐาน" }, { status: 404 });
  try {
    let found = false;
    await updateEmployeeStore(async (c, state) => {
      const { rows: [file] } = await c.query("DELETE FROM attendance_evidence WHERE id=$1 RETURNING id,employee_id,shift_date::text,filename,source,provider_name,note", [id]);
      if (!file) return;
      found = true;
      const entry = { id: crypto.randomUUID(), key: `${file.employee_id}|${file.shift_date}`, actor: "ผู้ใช้งานเว็บ", timestamp: new Date().toISOString(), reason: "ลบหลักฐานการมาทำงาน", before: JSON.stringify(file), after: "" };
      await c.query("UPDATE workspace SET data=$1 WHERE id=1", [JSON.stringify({ ...state.data, audit: [entry, ...state.data.audit] })]);
    });
    return Response.json(found ? { ok: true } : { error: "ไม่พบหลักฐาน" }, { status: found ? 200 : 404 });
  } catch {
    return Response.json({ error: "ลบหลักฐานไม่สำเร็จ" }, { status: 500 });
  }
}
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await guard(false, false);
  if (denied) return denied;
  const { id } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return new Response("Not found", { status: 404 });
  const {
    rows: [file],
  } = await employeeDB.query(
    "SELECT filename,content_type,content FROM attendance_evidence WHERE id=$1",
    [id],
  );
  if (!file) return new Response("Not found", { status: 404 });
  const preview =
    new URL(request.url).searchParams.get("preview") === "1" &&
    file.content_type.startsWith("image/");
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.content_type,
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="evidence"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
