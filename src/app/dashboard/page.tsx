
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { money } from "@/lib/money";
import { useMe } from "@/lib/useMe";
import SalesChart from "@/components/SalesChart";
import type { ChartPoint, Dashboard } from "@/types";

type Period = "DAY" | "WEEK" | "MONTH";

const periodLabel: Record<Period, string> = {
  DAY: "30 ថ្ងៃ",
  WEEK: "12 សប្តាហ៍",
  MONTH: "12 ខែ",
};

function Stat({
  title,
  value,
  sub,
  danger,
}: {
  title: string;
  value: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          danger ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const me = useMe();

  const privileged =
    me?.role === "ADMIN" || me?.role === "MANAGER";

  const [data, setData] = useState<Dashboard | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [period, setPeriod] = useState<Period>("DAY");
  const [error, setError] = useState("");
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);

  // Load dashboard data
  useEffect(() => {
    if (!privileged) return;

    let cancelled = false;

    async function loadDashboard() {
      setLoadingDashboard(true);
      setError("");

      try {
        const result = await apiFetch<Dashboard>(
          "/api/reports/dashboard"
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "មានបញ្ហាក្នុងការផ្ទុក Dashboard"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [privileged]);

  // Load sales chart
  useEffect(() => {
    if (!privileged) return;

    let cancelled = false;

    async function loadChart() {
      setLoadingChart(true);

      try {
        const result = await apiFetch<ChartPoint[]>(
          `/api/reports/sales-chart?period=${period}`
        );

        if (!cancelled) {
          setChart(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "មានបញ្ហាក្នុងការផ្ទុកក្រាហ្វ"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingChart(false);
        }
      }
    }

    loadChart();

    return () => {
      cancelled = true;
    };
  }, [privileged, period]);

  function logout() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

  if (!me) {
    return <p className="p-8">កំពុងផ្ទុក...</p>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            សួស្តី {me.fullName} 👋
          </h1>
          <p className="text-sm text-gray-600">
            Role: <b>{me.role}</b> | {me.email}
          </p>
        </div>

        <button
          onClick={logout}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>

      {!privileged && (
        <Link
          href="/dashboard/pos"
          className="inline-block rounded bg-green-600 px-6 py-3 text-lg font-bold text-white"
        >
          🛒 ចាប់ផ្តើមលក់
        </Link>
      )}

      {privileged && (
        <>
          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loadingDashboard && (
            <p className="mb-4 text-gray-500">
              កំពុងផ្ទុកទិន្នន័យ Dashboard...
            </p>
          )}

          {data && (
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat
                title="ការលក់ថ្ងៃនេះ"
                value={money(data.today.revenue)}
                sub={`${data.today.orderCount} Order`}
              />

              <Stat
                title="ការលក់ខែនេះ"
                value={money(data.month.revenue)}
                sub={`${data.month.orderCount} Order`}
              />

              <Stat
                title="VAT ខែនេះ"
                value={money(data.month.tax)}
              />

              <Link href="/dashboard/products">
                <Stat
                  title="ទំនិញស្តុកទាប"
                  value={String(data.lowStockCount)}
                  sub="ចុចដើម្បីមើល"
                  danger={data.lowStockCount > 0}
                />
              </Link>
            </div>
          )}

          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">
                ការលក់ ({periodLabel[period]})
              </h2>

              <div className="flex gap-1">
                {(Object.keys(periodLabel) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded px-3 py-1 text-sm ${
                      period === p
                        ? "bg-blue-600 text-white"
                        : "border"
                    }`}
                  >
                    {periodLabel[p]}
                  </button>
                ))}
              </div>
            </div>

            {loadingChart ? (
              <p className="py-8 text-center text-gray-500">
                កំពុងផ្ទុកក្រាហ្វ...
              </p>
            ) : (
              <SalesChart points={chart} />
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 font-bold">
              ទំនិញលក់ដាច់ (7 ថ្ងៃចុងក្រោយ)
            </h2>

            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-1">#</th>
                  <th>ទំនិញ</th>
                  <th className="text-right">ចំនួន</th>
                  <th className="text-right">ការលក់</th>
                </tr>
              </thead>

              <tbody>
                {data?.topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-t">
                    <td className="py-2">{i + 1}</td>
                    <td>{p.productName}</td>
                    <td className="text-right">{p.quantity}</td>
                    <td className="text-right">
                      {money(p.revenue)}
                    </td>
                  </tr>
                ))}

                {data && data.topProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-gray-500"
                    >
                      មិនទាន់មានការលក់
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}