import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminDashboardClient />;
}
