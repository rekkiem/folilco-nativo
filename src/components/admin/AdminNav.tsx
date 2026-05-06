"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/reservations", label: "Reservas", icon: "📋" },
  { href: "/admin/stock", label: "Stock", icon: "📦" },
  { href: "/admin/calendar", label: "Calendario", icon: "📅" },
];

export default function AdminNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-gray-900 border-r border-gray-800 flex-col z-40">
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="font-display text-lg text-gray-100">🌿 Folilco Admin</div>
          <div className="text-gray-500 text-xs mt-0.5">@{username}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-emerald-900/50 text-emerald-400 font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors mb-1"
          >
            <span>🌐</span> Ver sitio
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Top bar mobile */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-40">
        <span className="font-display text-gray-100">🌿 Admin</span>
        <div className="flex items-center gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2 rounded-lg text-lg ${
                pathname.startsWith(item.href)
                  ? "bg-emerald-900/50"
                  : "hover:bg-gray-800"
              }`}
              title={item.label}
            >
              {item.icon}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
