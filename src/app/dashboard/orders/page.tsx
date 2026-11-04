
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { money } from "@/lib/money";
import { useMe } from "@/lib/useMe";
import Receipt from "@/components/Receipt";
import type { Order, OrderSummary, PageResponse } from "@/types";

const statusStyle: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  VOIDED: "bg-gray-200 text-gray-600",
  REFUNDED: "bg-orange-100 text-orange-700",
};

const emptyFilters = {
  keyword: "",
  from: "",
  to: "",
  cashier: "",
  paymentMethod: "",
  status: "",
};

type Filters = typeof emptyFilters;

const isToday = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return false;

  return date.toDateString() === new Date().toDateString();
};

export default function OrdersPage() {
  const me = useMe();

  const privileged =
    me?.role === "ADMIN" || me?.role === "MANAGER";

  const [data, setData] =
    useState<PageResponse<OrderSummary> | null>(null);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [query, setQuery] = useState<Filters>(emptyFilters);

  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<Order | null>(null);
  const [viewing, setViewing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const input = "rounded border p-2 text-sm";

  // ---------- Validate Date Range ----------

  const validDateRange =
    !query.from || !query.to || query.from <= query.to;

  // ---------- Debounce Filters ----------

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(filters);
      setPage(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters]);

  // ---------- Load Orders ----------

  const load = useCallback(async () => {
    if (!validDateRange) {
      setData(null);
      setError("ថ្ងៃចាប់ផ្តើមមិនអាចធំជាងថ្ងៃបញ្ចប់បានទេ");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        size: "10",
      });

      Object.entries(query).forEach(([key, value]) => {
        // Cashier filter សម្រាប់ Admin និង Manager ប៉ុណ្ណោះ
        if (value && (key !== "cashier" || privileged)) {
          params.set(key, value);
        }
      });

      const result = await apiFetch<PageResponse<OrderSummary>>(
        `/api/orders?${params.toString()}`,
      );

      setData(result);
    } catch (err) {
      setData(null);

      setError(
        err instanceof Error
          ? err.message
          : "មិនអាចទាញយកប្រវត្តិការលក់បានទេ",
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, privileged, validDateRange]);

  useEffect(() => {
    if (!me) return;

    let cancelled = false;

    async function fetchOrders() {
      if (!validDateRange) {
        setData(null);
        setError("ថ្ងៃចាប់ផ្តើមមិនអាចធំជាងថ្ងៃបញ្ចប់បានទេ");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          size: "10",
        });

        Object.entries(query).forEach(([key, value]) => {
          if (value && (key !== "cashier" || privileged)) {
            params.set(key, value);
          }
        });

        const result = await apiFetch<PageResponse<OrderSummary>>(
          `/api/orders?${params.toString()}`,
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof Error
              ? err.message
              : "មិនអាចទាញយកប្រវត្តិការលក់បានទេ",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [me, page, query, privileged, refreshKey, validDateRange]);

  // ---------- Handle Filter Changes ----------

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters({ ...emptyFilters });
    setQuery({ ...emptyFilters });
    setPage(0);
    setError("");
  }

  // ---------- View Order Details ----------

  async function view(id: number) {
    setViewing(true);
    setError("");

    try {
      const order = await apiFetch<Order>(`/api/orders/${id}`);

      setSelected(order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "មិនអាចបង្ហាញវិក្កយបត្របានទេ",
      );
    } finally {
      setViewing(false);
    }
  }

  // ---------- Void / Refund ----------

  async function cancel(type: "void" | "refund") {
    if (!selected || actionLoading) return;

    if (type === "void" && !isToday(selected.createdAt)) {
      setError("មិនអាច Void Order ដែលមិនមែនជាការលក់ថ្ងៃនេះបានទេ");
      return;
    }

    const reason = window.prompt(
      type === "void"
        ? "សូមបញ្ចូលមូលហេតុនៃការ Void:"
        : "សូមបញ្ចូលមូលហេតុនៃការ Refund:",
    );

    if (!reason?.trim()) return;

    setActionLoading(true);
    setError("");

    try {
      const updated = await apiFetch<Order>(
        `/api/orders/${selected.id}/${type}`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        },
      );

      setSelected(updated);

      // Refresh Order list
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `មិនអាច ${type} Order បានទេ`,
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- Loading / Authorization ----------

  if (!me) {
    return (
      <p className="p-8">កំពុងផ្ទុកព័ត៌មានអ្នកប្រើប្រាស់...</p>
    );
  }

  // ---------- UI ----------

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">

      <h1 className="mb-4 text-2xl font-bold">
        ប្រវត្តិការលក់{" "}
        {!privileged && (
          <span className="text-sm font-normal text-gray-500">
            (របស់ខ្ញុំ)
          </span>
        )}
      </h1>

      {/* Filters */}

      <div className="mb-4 flex flex-wrap items-end gap-3">

        <input
          className={`${input} w-52`}
          placeholder="លេខវិក្កយបត្រ"
          value={filters.keyword}
          onChange={(e) =>
            updateFilter("keyword", e.target.value)
          }
        />

        <label className="text-xs text-gray-500">
          ចាប់ពី
          <input
            type="date"
            className={`${input} block`}
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) =>
              updateFilter("from", e.target.value)
            }
          />
        </label>

        <label className="text-xs text-gray-500">
          ដល់
          <input
            type="date"
            className={`${input} block`}
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) =>
              updateFilter("to", e.target.value)
            }
          />
        </label>

        <select
          className={input}
          value={filters.paymentMethod}
          onChange={(e) =>
            updateFilter("paymentMethod", e.target.value)
          }
        >
          <option value="">គ្រប់វិធីបង់ប្រាក់</option>
          <option value="CASH">CASH</option>
          <option value="KHQR">KHQR</option>
          <option value="CARD">CARD</option>
        </select>

        <select
          className={input}
          value={filters.status}
          onChange={(e) =>
            updateFilter("status", e.target.value)
          }
        >
          <option value="">គ្រប់ស្ថានភាព</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="VOIDED">VOIDED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>

        {privileged && (
          <input
            className={`${input} w-52`}
            placeholder="Email Cashier"
            value={filters.cashier}
            onChange={(e) =>
              updateFilter("cashier", e.target.value)
            }
          />
        )}

        <button
          type="button"
          onClick={clearFilters}
          className="text-sm text-gray-500 underline"
        >
          សម្អាត Filter
        </button>
      </div>

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
        <p className="mb-3 text-sm text-gray-500">
          កំពុងផ្ទុកប្រវត្តិការលក់...
        </p>
      )}

      {/* Orders Table */}

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-left text-sm">

          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">លេខវិក្កយបត្រ</th>
              <th className="p-3">កាលបរិច្ឆេទ</th>
              <th className="p-3">Cashier</th>
              <th className="p-3">បង់ប្រាក់</th>
              <th className="p-3 text-right">សរុប</th>
              <th className="p-3">ស្ថានភាព</th>
              <th className="p-3">សកម្មភាព</th>
            </tr>
          </thead>

          <tbody>
            {data?.content.map((order) => (
              <tr key={order.id} className="border-t">

                <td className="p-3 font-mono">
                  {order.orderNumber}
                </td>

                <td className="p-3">
                  {new Date(order.createdAt).toLocaleString()}
                </td>

                <td className="p-3">
                  {order.cashierEmail}
                </td>

                <td className="p-3">
                  {order.paymentMethod}
                </td>

                <td
                  className={`p-3 text-right ${
                    order.status !== "COMPLETED"
                      ? "text-gray-400 line-through"
                      : ""
                  }`}
                >
                  {money(order.total)}
                </td>

                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      statusStyle[order.status] ?? "bg-gray-100"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>

                <td className="p-3">
                  <button
                    type="button"
                    disabled={viewing}
                    onClick={() => view(order.id)}
                    className="text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {viewing ? "កំពុងផ្ទុក..." : "មើល"}
                  </button>
                </td>
              </tr>
            ))}

            {!loading && data?.content.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-gray-500"
                >
                  មិនមានវិក្កយបត្រទេ
                </td>
              </tr>
            )}

            {!loading && !data && !error && (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-gray-500"
                >
                  មិនមានទិន្នន័យទេ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">

          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((previous) => previous - 1)}
            className="rounded border px-3 py-2 disabled:opacity-40"
          >
            ← ថយក្រោយ
          </button>

          <span>
            ទំព័រ {data.page + 1} / {data.totalPages}
            {" "} (សរុប {data.totalElements})
          </span>

          <button
            type="button"
            disabled={
              page + 1 >= data.totalPages || loading
            }
            onClick={() => setPage((previous) => previous + 1)}
            className="rounded border px-3 py-2 disabled:opacity-40"
          >
            បន្ទាប់ →
          </button>
        </div>
      )}

      {/* Receipt Modal */}

      {selected && (
        <Receipt
          order={selected}
          closeLabel="បិទ"
          onClose={() => setSelected(null)}
          extra={
            privileged && selected.status === "COMPLETED" ? (
              <div className="mt-2 flex gap-2 print:hidden">

                {isToday(selected.createdAt) && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => cancel("void")}
                    className="flex-1 rounded border border-red-300 py-2 text-red-600 disabled:opacity-50"
                  >
                    {actionLoading ? "កំពុងដំណើរការ..." : "Void"}
                  </button>
                )}

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => cancel("refund")}
                  className="flex-1 rounded border border-orange-300 py-2 text-orange-700 disabled:opacity-50"
                >
                  {actionLoading ? "កំពុងដំណើរការ..." : "Refund"}
                </button>
              </div>
            ) : null
          }
        />
      )}
    </main>
  );
}
