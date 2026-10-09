import { cookies, headers } from "next/headers";
import { employeeDB } from "./database";
import { verifyToken } from "./auth-crypto";
export const SESSION_COOKIE = "cj_session";
export type Account = { id: string; username: string; displayName: string; role: "super_admin" | "supervisor"; expiresAt: number };
export async function jwtSecret() {
  const { rows } = await employeeDB.query("SELECT jwt_secret FROM auth_settings WHERE id=1");
  if (!rows[0]) throw Error("ยังไม่ได้ตั้งค่าบัญชีเริ่มต้น");
  return rows[0].jwt_secret as string;
}
export async function currentSession(): Promise<(Account & { sessionId: string }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = verifyToken(token, await jwtSecret());
  if (!claims) return null;
  const { rows } = await employeeDB.query(
    `SELECT u.id,u.username,u.display_name AS "displayName",u.role FROM app_users u
     JOIN auth_sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.active AND s.user_version=u.version AND s.expires_at>now()`,
    [claims.sub, claims.jti],
  );
  return rows[0] ? { ...rows[0], sessionId: claims.jti, expiresAt: claims.exp * 1000 } : null;
}
export async function checkOrigin() {
  const h = await headers();
  const origin = h.get("origin"), host = h.get("x-forwarded-host") || h.get("host");
  if (h.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}
export async function guard(admin = false, mutation = false): Promise<Response | null> {
  if (mutation && !(await checkOrigin())) return Response.json({ error: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" }, { status: 403 });
  const user = await currentSession();
  if (!user) return Response.json({ error: "กรุณาล็อกอินใหม่" }, { status: 401 });
  if (admin && user.role !== "super_admin") return Response.json({ error: "เฉพาะ Super Admin เท่านั้น" }, { status: 403 });
  return null;
}
export async function secureCookie() {
  const h = await headers();
  return process.env.AUTH_COOKIE_SECURE === "true" || h.get("x-forwarded-proto") === "https";
}
