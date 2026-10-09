import { randomUUID } from "node:crypto";
import { guard, currentSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth-crypto";
import { employeeDB } from "@/lib/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const denied = await guard(true); if (denied) return denied;
  const { rows } = await employeeDB.query(`SELECT id,username,display_name AS "displayName",email,role,active,version,created_at AS "createdAt" FROM app_users ORDER BY created_at`);
  const history = await employeeDB.query("SELECT actor,action,username,created_at FROM account_audit ORDER BY id DESC LIMIT 100");
  return Response.json({ accounts: rows, history: history.rows }, { headers: { "Cache-Control": "no-store" } });
}
async function mutate(request: Request, method: string) {
  const denied = await guard(true, true); if (denied) return denied;
  const actor = (await currentSession())!;
  const c = await employeeDB.connect();
  try {
    const b = await request.json();
    if (method !== "POST" && (typeof b.id !== "string" || !/^[a-f0-9-]{36}$/.test(b.id) || !Number.isSafeInteger(b.version))) throw Error("ข้อมูลบัญชีไม่ถูกต้อง");
    let passwordHash: string | undefined;
    let revoked = false;
    let email: string | undefined;
    if (method !== "DELETE") {
      if (b.email !== undefined) {
        if (typeof b.email !== "string") throw Error("รูปแบบ Email ไม่ถูกต้อง");
        const normalized: string = b.email.trim();
        if (normalized.length > 254 || (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))) throw Error("กรุณากรอก Email ให้ถูกต้อง หรือเว้นว่างไว้");
        email = normalized;
      }
      if (typeof b.username !== "string" || !/^[a-zA-Z0-9._-]{3,64}$/.test(b.username) ||
        typeof b.displayName !== "string" || !b.displayName.trim() || b.displayName.length > 100 ||
        !["super_admin", "supervisor"].includes(b.role) || typeof b.active !== "boolean") throw Error("กรุณาระบุชื่อผู้ใช้ ชื่อแสดง และสิทธิ์ให้ถูกต้อง");
      if (typeof b.password !== "string" || b.password.length > 256 || (method === "POST" || b.password) && b.password.length < 6) throw Error("รหัสผ่านต้องมี 6–256 ตัวอักษร");
      if (b.password) passwordHash = await hashPassword(b.password);
    }
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(73125009)");
    const allowed = await c.query(`SELECT 1 FROM app_users u JOIN auth_sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.active AND u.role='super_admin' AND u.version=s.user_version AND s.expires_at>now()`, [actor.id, actor.sessionId]);
    if (!allowed.rowCount) throw Error("ไม่มีสิทธิ์จัดการบัญชีแล้ว กรุณาล็อกอินใหม่");
    let username = b.username?.toLowerCase();
    if (method !== "POST") {
      const { rows } = await c.query("SELECT * FROM app_users WHERE id=$1 FOR UPDATE", [b.id]);
      const old = rows[0];
      if (!old) throw Error("ไม่พบบัญชีนี้");
      if (old.version !== b.version) throw Error("บัญชีถูกแก้ไขแล้ว กรุณาโหลดใหม่");
      if (b.id === actor.id && (method === "DELETE" || !b.active || b.role !== "super_admin")) throw Error("ไม่สามารถลบ ปิดใช้งาน หรือลดสิทธิ์บัญชีที่กำลังใช้อยู่");
      if (old.role === "super_admin" && old.active && (method === "DELETE" || !b.active || b.role !== "super_admin")) {
        const admins = await c.query("SELECT count(*) FROM app_users WHERE active AND role='super_admin'");
        if (Number(admins.rows[0].count) <= 1) throw Error("ต้องเหลือ Super Admin ที่ใช้งานได้อย่างน้อย 1 บัญชี");
      }
      if (method === "DELETE") {
        username = old.username;
        await c.query("DELETE FROM app_users WHERE id=$1", [b.id]);
      } else {
        revoked = Boolean(passwordHash) || username !== old.username ||
          b.displayName.trim() !== old.display_name || b.role !== old.role || b.active !== old.active;
        await c.query(`UPDATE app_users SET username=$2,display_name=$3,role=$4,active=$5,password_hash=COALESCE($6,password_hash),email=$7,version=version+1 WHERE id=$1`, [b.id, username, b.displayName.trim(), b.role, b.active, passwordHash, email ?? old.email]);
        if (revoked) await c.query("DELETE FROM auth_sessions WHERE user_id=$1", [b.id]);
        else await c.query("UPDATE auth_sessions SET user_version=$2 WHERE user_id=$1 AND user_version=$3", [b.id, old.version + 1, old.version]);
      }
    } else {
      await c.query("INSERT INTO app_users(id,username,display_name,password_hash,role,active,email) VALUES($1,$2,$3,$4,$5,$6,$7)", [randomUUID(), username, b.displayName.trim(), passwordHash, b.role, b.active, email ?? ""]);
    }
    await c.query("INSERT INTO account_audit(actor,action,username) VALUES($1,$2,$3)", [actor.username, method === "POST" ? "สร้างบัญชี" : method === "DELETE" ? "ลบบัญชี" : revoked ? "แก้ไขบัญชีและยกเลิกเซสชันเดิม" : "บันทึก Email โดยคงเซสชันเดิม", username]);
    await c.query("COMMIT");
    return Response.json({ ok: true, requiresLogin: revoked && b.id === actor.id });
  } catch (e) {
    await c.query("ROLLBACK");
    const duplicate = (e as { code?: string }).code === "23505";
    return Response.json({ error: duplicate ? "ชื่อผู้ใช้นี้มีอยู่แล้ว" : e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" }, { status: 400 });
  } finally { c.release(); }
}
export const POST = (request: Request) => mutate(request, "POST");
export const PUT = (request: Request) => mutate(request, "PUT");
export const DELETE = (request: Request) => mutate(request, "DELETE");
