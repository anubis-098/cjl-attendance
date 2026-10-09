import { currentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await currentSession()) redirect("/attendance");
  return <LoginForm />;
}
