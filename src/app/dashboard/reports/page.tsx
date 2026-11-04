
"use client";

import { useEffect, useState } from "react";
import { apiDownload, apiFetch } from "@/lib/api";
import { toDateInput } from "@/lib/date";
import { money } from "@/lib/money";
import { useMe } from "@/lib/useMe";
import type { SalesReport } from "@/types";

const th = "p-3";
const card = "rounded-xl bg-white p-4 shadow";

export default function ReportsPage() {
  const me = useMe();
  const privileged = me?.role === "ADMIN" || me?.role === "MANAGER";

  const today = new Date();

  const [from, setFrom] = useState(
    toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [to, setTo] = useState(toDateInput(today));

  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const validRange = Boolean(from && to && from <= to);

  useEffect(() => {
    if (!privileged || !validRange) {
      setReport(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");
      setReport(null);

      try {
        const params = new URLSearchParams({ from, to });
        const data = await apiFetch<SalesReport>(
          `/api/reports/sales?${params.toString()}`,
        );

        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(
            err instanceof Error
              ? err.message
              : "មិនអាចផ្ទុករបាយការណ៍បានទេ",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [privileged, validRange, from, to]);

  async function exportExcel() {
    if (!validRange || !report || exporting) return;

    setExporting(true);
    setError("");

    try {
      const params = new URLSearchParams({ from, to });

      await apiDownload(
        `/api/reports/sales/export?${params.toString()}`,
        `sales-${from}_${to}.xlsx`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "មិនអាច Export Excel បានទេ",
      );
    } finally {
      setExporting(false);
    }
  }

  if (!me) {
    return <p className="p-8">កំពុងផ្ទុកព័ត៌មានអ្នកប្រើប្រាស់...</p>;
  }

  if (!privileged) {
    return (
      <p className="p-8 text-red-600">
        អ្នកគ្មានសិទ្ធិមើលរបាយការណ៍ទេ
      </p>
    );
  }

  const avg =
    report && report.summary.orderCount > 0
      ? report.summary.revenue / report.summary.orderCount
      : 0;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="mb-4 text-2xl font-bold">របាយការណ៍ការលក់</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">
          ចាប់ពី
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="block rounded border p-2 text-sm"
          />
        </label>

        <label className="text-xs text-gray-500">
          ដល់
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="block rounded border p-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={exportExcel}
          disabled={exporting || loading || !report || !validRange}
          className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "កំពុងទាញយក..." : "⬇ Export Excel"}
        </button>
      </div>

      {!validRange && (
        <div className="mb-4 rounded bg-yellow-100 p-3 text-sm text-yellow-800">
          សូមជ្រើសរើសកាលបរិច្ឆេទឱ្យបានត្រឹមត្រូវ។ ថ្ងៃចាប់ផ្តើមត្រូវតែមុន
          ឬស្មើថ្ងៃបញ្ចប់។
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="py-6 text-gray-500">កំពុងផ្ទុករបាយការណ៍...</p>
      )}

      {!loading && validRange && !report && !error && (
        <p className="py-6 text-gray-500">មិនមានទិន្នន័យរបាយការណ៍ទេ។</p>
      )}

      {report && !loading && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className={card}>
              <div className="text-sm text-gray-500">ចំណូល (រួម VAT)</div>
              <div className="text-xl font-bold">
                {money(report.summary.revenue)}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">ចំនួន Order</div>
              <div className="text-xl font-bold">
                {report.summary.orderCount}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">មធ្យម/Order</div>
              <div className="text-xl font-bold">{money(avg)}</div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">Discount</div>
              <div className="text-xl font-bold">
                {money(report.summary.discount)}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">VAT</div>
              <div className="text-xl font-bold">
                {money(report.summary.tax)}
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section className={card}>
              <h2 className="mb-2 font-bold">តាម Cashier</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className={th}>Cashier</th>
                      <th className={`${th} text-right`}>Order</th>
                      <th className={`${th} text-right`}>ចំណូល</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.byCashier.map((c) => (
                      <tr key={c.cashierEmail} className="border-t">
                        <td className={th}>{c.cashierEmail}</td>
                        <td className={`${th} text-right`}>{c.orderCount}</td>
                        <td className={`${th} text-right`}>
                          {money(c.revenue)}
                        </td>
                      </tr>
                    ))}

                    {report.byCashier.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-4 text-center text-gray-500"
                        >
                          គ្មានទិន្នន័យ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={card}>
              <h2 className="mb-2 font-bold">តាមថ្ងៃ</h2>

              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className={th}>ថ្ងៃ</th>
                      <th className={`${th} text-right`}>Order</th>
                      <th className={`${th} text-right`}>ចំណូល</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.daily.map((d) => (
                      <tr key={d.date} className="border-t">
                        <td className={th}>{d.date}</td>
                        <td className={`${th} text-right`}>{d.orders}</td>
                        <td className={`${th} text-right`}>
                          {money(d.revenue)}
                        </td>
                      </tr>
                    ))}

                    {report.daily.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-4 text-center text-gray-500"
                        >
                          គ្មានទិន្នន័យ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className={card}>
            <h2 className="mb-1 font-bold">តាមទំនិញ</h2>

            <p className="mb-2 text-xs text-gray-500">
              * ការលក់តាមទំនិញគិតមុនបញ្ចុះតម្លៃ និង VAT របស់ Order។
              ដូច្នេះផលបូកអាចខុសពីចំណូលសរុបខាងលើ។
            </p>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className={th}>SKU</th>
                    <th className={th}>ទំនិញ</th>
                    <th className={`${th} text-right`}>ចំនួន</th>
                    <th className={`${th} text-right`}>ការលក់</th>
                  </tr>
                </thead>

                <tbody>
                  {report.byProduct.map((p) => (
                    <tr key={p.productId} className="border-t">
                      <td className={`${th} font-mono`}>{p.sku}</td>
                      <td className={th}>{p.productName}</td>
                      <td className={`${th} text-right`}>{p.quantity}</td>
                      <td className={`${th} text-right`}>
                        {money(p.revenue)}
                      </td>
                    </tr>
                  ))}

                  {report.byProduct.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-4 text-center text-gray-500"
                      >
                        គ្មានទិន្នន័យ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
