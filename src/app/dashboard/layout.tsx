import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex gap-6 border-b bg-white px-8 py-3 text-sm font-medium">
        <Link href="/dashboard/pos">Dashboard</Link>
        <Link href="/dashboard/products">Products</Link>
        <Link href="/dashboard/categories">Categories</Link>
      </nav>
      {children}
    </div>
  );
}