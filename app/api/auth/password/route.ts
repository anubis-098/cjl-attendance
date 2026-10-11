import { guard, currentSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth-crypto";
import { employeeDB } from "@/lib/database";
export async function POST(request: Request) {
  const denied = await guard(false, true, true); if (denied) return denied;
  const user = (await currentSession())!;
  const { currentPassword, password } = await request.json();
  if (typeof currentPassword !== "string" || currentPassword.length > 256 || typeof password !== "string" || password.length < 6 || password.length > 256) return Response.json({ error: "รหัสผ่านใหม่ต้องมี 6–256 ตัวอักษร" }, { status: 400 });
  const { rows } = await employeeDB.query("SELECT password_hash,version FROM app_users WHERE id=$1", [user.id]);
  if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) return Response.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
  const hash = await hashPassword(password);
  const c = await employeeDB.connect();
  try {
    await c.query("BEGIN");
    const result = await c.query("UPDATE app_users SET password_hash=$1,version=version+1 WHERE id=$2 AND version=$3 AND active RETURNING id", [hash, user.id, rows[0].version]);
    if (!result.rowCount) throw Error("บัญชีถูกแก้ไขแล้ว กรุณาล็อกอินใหม่");
    await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [user.id]);
    await c.query("INSERT INTO account_audit(actor,action,username) VALUES($1,'เปลี่ยนรหัสผ่านตนเอง',$1)", [user.username]);
    await c.query("COMMIT");
    return Response.json({ ok: true });
  } catch { await c.query("ROLLBACK"); return Response.json({ error: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่" }, { status: 409 }); }
  finally { c.release(); }
}
