import { redirect } from "next/navigation";
import { hasAdminSession } from "@/server/auth";
import AdminDashboard from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await hasAdminSession())) redirect("/");
  return <AdminDashboard />;
}
