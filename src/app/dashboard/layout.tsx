
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Navigation */}
      <nav className="flex flex-wrap gap-6 border-b bg-white px-8 py-3 text-sm font-medium">
        <Link
          href="/dashboard"
          className="hover:text-blue-600"
        >
          Dashboard
        </Link>

        <Link
          href="/dashboard/pos"
          className="font-bold text-green-700 hover:text-green-800"
        >
          🛒 POS
        </Link>

        <Link
          href="/dashboard/orders"
          className="hover:text-blue-600"
        >
          ប្រវត្តិលក់
        </Link>

        <Link
          href="/dashboard/products"
          className="hover:text-blue-600"
        >
          ទំនិញ
        </Link>

        <Link
          href="/dashboard/categories"
          className="hover:text-blue-600"
        >
          ប្រភេទទំនិញ
        </Link>

        <Link
          href="/dashboard/reports"
          className="hover:text-blue-600"
        >
          របាយការណ៍
        </Link>

        <Link
          href="/dashboard/settings"
          className="hover:text-blue-600"
        >
          ការកំណត់
        </Link>
      </nav>

      {/* Nested Dashboard Page */}
      <main>{children}</main>
    </div>
  );
}