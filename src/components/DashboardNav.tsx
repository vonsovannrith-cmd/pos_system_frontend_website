"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";

const ALL = ["ADMIN", "MANAGER", "CASHIER"];
const MANAGERS = ["ADMIN", "MANAGER"];

const links = [
  { href: "/dashboard", label: "Dashboard", roles: ALL },
  { href: "/dashboard/pos", label: "🛒 POS", roles: ALL },
  { href: "/dashboard/orders", label: "ប្រវត្តិលក់", roles: ALL },
  { href: "/dashboard/products", label: "ទំនិញ", roles: ALL },
  { href: "/dashboard/categories", label: "ប្រភេទទំនិញ", roles: ALL },
  { href: "/dashboard/reports", label: "របាយការណ៍", roles: MANAGERS },
  { href: "/dashboard/users", label: "បុគ្គលិក", roles: ["ADMIN"] },
  { href: "/dashboard/settings", label: "ការកំណត់", roles: ["ADMIN"] },
];

export default function DashboardNav() {
  const me = useMe();
  const pathname = usePathname();

  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex flex-wrap items-center gap-6 border-b bg-white px-8 py-3 text-sm font-medium">
      {links
        .filter((l) => me && l.roles.includes(me.role))
        .map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={active(l.href) ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-700"}
          >
            {l.label}
          </Link>
        ))}
      <Link href="/dashboard/account" className="ml-auto text-gray-500">
        🔑 ប្តូរ Password
      </Link>
    </nav>
  );
}