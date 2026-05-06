import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminCalendarClient from "@/components/admin/AdminCalendarClient";

export default async function AdminCalendarPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminCalendarClient />;
}
