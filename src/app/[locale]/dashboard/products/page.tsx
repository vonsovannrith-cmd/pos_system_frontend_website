
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { imageSrc } from "@/lib/image";
import { money } from "@/lib/money";
import { useMe } from "@/lib/useMe";
import ProductForm from "@/components/ProductForm";
import ProductThumb from "@/components/ProductThumb";
import type { Category, PageResponse, Product } from "@/types";

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  const me = useMe();
  const canManage = me?.role === "ADMIN" || me?.role === "MANAGER";

  const [data, setData] = useState<PageResponse<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword);
      setPage(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Load categories
  useEffect(() => {
    apiFetch<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {
        setCategories([]);
      });
  }, []);

  // Load products
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: "10",
        sort: "name,asc",
      });

      if (search) {
        params.set("keyword", search);
      }

      if (categoryId) {
        params.set("categoryId", categoryId);
      }

      const result = await apiFetch<PageResponse<Product>>(
        `/api/products?${params}`,
      );

      setData(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
    }
  }, [page, search, categoryId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Activate / Deactivate product
  async function toggleActive(p: Product) {
    try {
      await apiFetch(
        `/api/products/${p.id}/active?value=${!p.active}`,
        { method: "PATCH" },
      );

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
    }
  }

  // Add stock
  async function stockIn(p: Product) {
    const input = prompt(t("stockPrompt", { name: p.name }));

    if (!input) return;

    const quantity = Number(input);

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError(t("invalidQty"));
      return;
    }

    try {
      await apiFetch(`/api/inventory/products/${p.id}/stock-in`, {
        method: "POST",
        body: JSON.stringify({
          quantity,
          reason: "Stock in",
        }),
      });

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
    }
  }

  const totalColumns = canManage ? 8 : 7;

  return (
    <main className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
              setError("");
              setNotice("");
            }}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            {t("add")}
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex gap-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 rounded border p-2"
        />

        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(0);
          }}
          className="rounded border p-2"
        >
          <option value="">{t("allCategories")}</option>

          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div className="mb-4 rounded bg-yellow-100 p-3 text-sm text-yellow-800">
          {notice}
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">{t("colImage")}</th>
              <th className="p-3">{t("colSku")}</th>
              <th className="p-3">{t("colName")}</th>
              <th className="p-3">{t("colCategory")}</th>
              <th className="p-3 text-right">{t("colPrice")}</th>
              <th className="p-3 text-right">{t("colStock")}</th>
              <th className="p-3">{t("colStatus")}</th>

              {canManage && (
                <th className="p-3">{t("colActions")}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {data?.content.map((p) => (
              <tr
                key={p.id}
                className={`border-t ${p.active ? "" : "opacity-50"}`}
              >
                <td className="p-2">
                  <ProductThumb
                    src={imageSrc(p.imageUrl)}
                    alt={p.name}
                    className="h-10 w-10 rounded"
                  />
                </td>

                <td className="p-3 font-mono">{p.sku}</td>

                <td className="p-3">{p.name}</td>

                <td className="p-3">{p.categoryName ?? "—"}</td>

                <td className="p-3 text-right">
                  {money(p.price)}
                </td>

                <td className="p-3 text-right">
                  <span
                    className={
                      p.lowStock ? "font-bold text-red-600" : ""
                    }
                  >
                    {p.stockQuantity}
                  </span>

                  {p.lowStock && (
                    <span className="ml-1 text-xs text-red-600">
                      {t("lowBadge")}
                    </span>
                  )}
                </td>

                <td className="p-3">
                  {p.active
                    ? t("statusActive")
                    : t("statusInactive")}
                </td>

                {canManage && (
                  <td className="space-x-3 p-3">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setShowForm(true);
                        setError("");
                        setNotice("");
                      }}
                      className="text-blue-600"
                    >
                      {t("edit")}
                    </button>

                    <button
                      onClick={() => stockIn(p)}
                      className="text-green-700"
                    >
                      {t("addStock")}
                    </button>

                    <button
                      onClick={() => toggleActive(p)}
                      className="text-gray-600"
                    >
                      {p.active
                        ? t("deactivate")
                        : t("activate")}
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {data && data.content.length === 0 && (
              <tr>
                <td
                  colSpan={totalColumns}
                  className="p-6 text-center text-gray-500"
                >
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            {tc("previous")}
          </button>

          <span>
            {tc("page", {
              current: String(data.page + 1),
              total: String(data.totalPages),
              count: String(data.totalElements),
            })}
          </span>

          <button
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            {tc("next")}
          </button>
        </div>
      )}

      {/* Product Form */}
      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={(warning) => {
            setShowForm(false);
            setNotice(warning ?? "");
            load();
          }}
        />
      )}
    </main>
  );
}
