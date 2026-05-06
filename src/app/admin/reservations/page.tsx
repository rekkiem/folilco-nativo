import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminReservationsClient from "@/components/admin/AdminReservationsClient";

export default async function AdminReservationsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminReservationsClient />;
}
