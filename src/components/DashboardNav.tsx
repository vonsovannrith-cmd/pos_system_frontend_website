"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useMe } from "@/lib/useMe";

const ALL = ["ADMIN", "MANAGER", "CASHIER"];
const MANAGERS = ["ADMIN", "MANAGER"];

const links = [
  { href: "/dashboard", key: "dashboard", roles: ALL },
  { href: "/dashboard/pos", key: "pos", roles: ALL },
  { href: "/dashboard/orders", key: "orders", roles: ALL },
  { href: "/dashboard/products", key: "products", roles: ALL },
  { href: "/dashboard/categories", key: "categories", roles: ALL },
  { href: "/dashboard/reports", key: "reports", roles: MANAGERS },
  { href: "/dashboard/users", key: "users", roles: ["ADMIN"] },
  { href: "/dashboard/settings", key: "settings", roles: ["ADMIN"] },
];

export default function DashboardNav() {
  const t = useTranslations("nav");
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
            {t(l.key)}
          </Link>
        ))}
      <div className="ml-auto flex items-center gap-4">
        <Link href="/dashboard/account" className="text-gray-500">{t("changePassword")}</Link>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}