import { cookies } from "next/headers";
import { currentSession, checkOrigin, SESSION_COOKIE } from "@/lib/auth";
import { employeeDB } from "@/lib/database";
export async function POST() {
  if (!(await checkOrigin())) return Response.json({ error: "ไม่อนุญาตคำขอนี้" }, { status: 403 });
  const user = await currentSession();
  if (user) await employeeDB.query("DELETE FROM auth_sessions WHERE id=$1", [user.sessionId]);
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
