import { currentSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await currentSession();
  if (!user) return Response.json({ error: "กรุณาล็อกอินใหม่" }, { status: 401 });
  const { sessionId: _, ...account } = user;
  return Response.json(account, { headers: { "Cache-Control": "no-store" } });
}
