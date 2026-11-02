"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

type Me = { id: number; fullName: string; email: string; role: string };

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
        }
      });
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

  if (!me) return <p className="p-8">កំពុងផ្ទុក...</p>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">សួស្តី {me.fullName} 👋</h1>
      <p className="mt-2 text-gray-600">
        Role: <b>{me.role}</b> | {me.email}
      </p>
      <button onClick={logout} className="mt-6 rounded bg-red-600 px-4 py-2 text-white">
        Logout
      </button>
    </main>
  );
}