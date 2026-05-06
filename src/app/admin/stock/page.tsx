import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminStockClient from "@/components/admin/AdminStockClient";

export default async function AdminStockPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminStockClient />;
}
