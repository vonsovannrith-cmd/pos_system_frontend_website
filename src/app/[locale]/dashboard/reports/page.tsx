
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiDownload, apiFetch } from "@/lib/api";
import { toDateInput } from "@/lib/date";
import { money } from "@/lib/money";
import { useMe } from "@/lib/useMe";
import type { SalesReport } from "@/types";

const th = "p-3";
const card = "rounded-xl bg-white p-4 shadow";

export default function ReportsPage() {
  const t = useTranslations("reports");

  const me = useMe();
  const privileged =
    me?.role === "ADMIN" || me?.role === "MANAGER";

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

  // Load sales report
  useEffect(() => {
    if (!privileged || !validRange) {
      setReport(null);
      setLoading(false);
      setError("");
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
            err instanceof Error ? err.message : t("loadError"),
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
  }, [privileged, validRange, from, to, t]);

  // Export Excel
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
        err instanceof Error ? err.message : t("exportError"),
      );
    } finally {
      setExporting(false);
    }
  }

  // Loading user
  if (!me) {
    return <p className="p-8">{t("loadingUser")}</p>;
  }

  // Permission check
  if (!privileged) {
    return (
      <p className="p-8 text-red-600">
        {t("permissionDenied")}
      </p>
    );
  }

  // Average order value
  const avg =
    report && report.summary.orderCount > 0
      ? report.summary.revenue / report.summary.orderCount
      : 0;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="mb-4 text-2xl font-bold">
        {t("title")}
      </h1>

      {/* Date Filter and Export */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">
          {t("from")}

          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="block rounded border p-2 text-sm"
          />
        </label>

        <label className="text-xs text-gray-500">
          {t("to")}

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
          {exporting
            ? t("downloading")
            : `⬇ ${t("exportExcel")}`}
        </button>
      </div>

      {/* Invalid Date Range */}
      {!validRange && (
        <div className="mb-4 rounded bg-yellow-100 p-3 text-sm text-yellow-800">
          {t("invalidDateRange")}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="py-6 text-gray-500">
          {t("loadingReport")}
        </p>
      )}

      {/* No Report */}
      {!loading && validRange && !report && !error && (
        <p className="py-6 text-gray-500">
          {t("noReport")}
        </p>
      )}

      {report && !loading && (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className={card}>
              <div className="text-sm text-gray-500">
                {t("revenue")}
              </div>

              <div className="text-xl font-bold">
                {money(report.summary.revenue)}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">
                {t("orders")}
              </div>

              <div className="text-xl font-bold">
                {report.summary.orderCount}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">
                {t("averageOrder")}
              </div>

              <div className="text-xl font-bold">
                {money(avg)}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">
                {t("discount")}
              </div>

              <div className="text-xl font-bold">
                {money(report.summary.discount)}
              </div>
            </div>

            <div className={card}>
              <div className="text-sm text-gray-500">
                {t("vat")}
              </div>

              <div className="text-xl font-bold">
                {money(report.summary.tax)}
              </div>
            </div>
          </div>

          {/* Cashier and Daily Reports */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* By Cashier */}
            <section className={card}>
              <h2 className="mb-2 font-bold">
                {t("byCashier")}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className={th}>{t("cashier")}</th>
                      <th className={`${th} text-right`}>
                        {t("orders")}
                      </th>
                      <th className={`${th} text-right`}>
                        {t("revenue")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.byCashier.map((c) => (
                      <tr key={c.cashierEmail} className="border-t">
                        <td className={th}>{c.cashierEmail}</td>

                        <td className={`${th} text-right`}>
                          {c.orderCount}
                        </td>

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
                          {t("noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* By Date */}
            <section className={card}>
              <h2 className="mb-2 font-bold">
                {t("byDate")}
              </h2>

              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className={th}>{t("date")}</th>

                      <th className={`${th} text-right`}>
                        {t("orders")}
                      </th>

                      <th className={`${th} text-right`}>
                        {t("revenue")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.daily.map((d) => (
                      <tr key={d.date} className="border-t">
                        <td className={th}>{d.date}</td>

                        <td className={`${th} text-right`}>
                          {d.orders}
                        </td>

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
                          {t("noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* By Product */}
          <section className={card}>
            <h2 className="mb-1 font-bold">
              {t("byProduct")}
            </h2>

            <p className="mb-2 text-xs text-gray-500">
              {t("productNote")}
            </p>

            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className={th}>{t("sku")}</th>
                    <th className={th}>{t("product")}</th>

                    <th className={`${th} text-right`}>
                      {t("quantity")}
                    </th>

                    <th className={`${th} text-right`}>
                      {t("sales")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.byProduct.map((p) => (
                    <tr key={p.productId} className="border-t">
                      <td className={`${th} font-mono`}>
                        {p.sku}
                      </td>

                      <td className={th}>{p.productName}</td>

                      <td className={`${th} text-right`}>
                        {p.quantity}
                      </td>

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
                        {t("noData")}
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
