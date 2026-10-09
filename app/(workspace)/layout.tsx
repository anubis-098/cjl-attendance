import { WorkspaceProvider } from "@/components/workspace/provider";
import Shell from "@/components/workspace/shell";
import AuthProvider from "@/components/auth-provider";
import { currentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { sessionId: _, ...user } = session;
  return (
    <AuthProvider user={user}>
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
    </AuthProvider>
  );
}
