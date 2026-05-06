import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // Si no hay sesión, redirigir al login
  // Excepción: el login mismo no necesita sesión
  // El layout de /admin/login lo manejaremos en la página

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {session && <AdminNav username={session.username} />}
      <main className={session ? "lg:pl-60 pt-16" : ""}>
        {children}
      </main>
    </div>
  );
}
