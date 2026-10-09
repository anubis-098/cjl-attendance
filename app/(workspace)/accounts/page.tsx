import { currentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountsPage from "@/components/accounts-page";
export default async function Page() {
  const user = await currentSession();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/attendance");
  return <AccountsPage />;
}
