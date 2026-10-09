import { randomUUID, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { employeeDB } from "@/lib/database";
import { checkOrigin, jwtSecret, secureCookie, SESSION_COOKIE } from "@/lib/auth";
import { signToken, verifyPassword, SESSION_SECONDS } from "@/lib/auth-crypto";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await checkOrigin())) return Response.json({ error: "ไม่อนุญาตคำขอนี้" }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length")) > 4096) return Response.json({ error: "ข้อมูลยาวเกินไป" }, { status: 400 });
    const input = await request.json();
    if (typeof input.username !== "string" || typeof input.password !== "string" || input.username.length > 64 || input.password.length > 256) return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    const username = input.username.trim().toLowerCase();
    const key = createHash("sha256").update(username).digest("hex");
    const { rows: attempts } = await employeeDB.query(
      `INSERT INTO auth_login_attempts(key,attempts) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET
       attempts=CASE WHEN auth_login_attempts.window_start < now()-interval '15 minutes' THEN 1 ELSE auth_login_attempts.attempts+1 END,
       window_start=CASE WHEN auth_login_attempts.window_start < now()-interval '15 minutes' THEN now() ELSE auth_login_attempts.window_start END RETURNING attempts`, [key]);
    if (attempts[0].attempts > 10) return Response.json({ error: "ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที" }, { status: 429 });
    const { rows } = await employeeDB.query("SELECT * FROM app_users WHERE username=$1", [username]);
    const user = rows[0];
    const dummy = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
    const valid = await verifyPassword(input.password, user?.password_hash || dummy);
    if (!valid || !user?.active) return Response.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    const id = randomUUID();
    const { token, claims } = signToken(user.id, id, await jwtSecret());
    // Recheck the version so a concurrent password reset cannot create a valid session.
    const inserted = await employeeDB.query(`INSERT INTO auth_sessions(id,user_id,expires_at,user_version)
      SELECT $1,id,to_timestamp($2),version FROM app_users WHERE id=$3 AND active AND version=$4 RETURNING id`, [id, claims.exp, user.id, user.version]);
    if (!inserted.rowCount) return Response.json({ error: "บัญชีถูกเปลี่ยน กรุณาล็อกอินใหม่" }, { status: 401 });
    await employeeDB.query("DELETE FROM auth_login_attempts WHERE key=$1 OR window_start < now()-interval '1 day'", [key]);
    await employeeDB.query("DELETE FROM auth_sessions WHERE expires_at<=now()");
    (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: await secureCookie(), path: "/", maxAge: SESSION_SECONDS, expires: new Date(claims.exp * 1000) });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าระบบ" }, { status: 503 }); }
}
