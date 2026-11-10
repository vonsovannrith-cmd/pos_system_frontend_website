"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import ProductForm from "@/components/ProductForm";
import type { Category, PageResponse, Product } from "@/types";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function ProductsPage() {
  const me = useMe();
  const canManage = me?.role === "ADMIN" || me?.role === "MANAGER";

  const [data, setData] = useState<PageResponse<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Debounce: Wait 400ms after typing stops before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(keyword);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), size: "10", sort: "name,asc" });
      if (search) params.set("keyword", search);
      if (categoryId) params.set("categoryId", categoryId);
      setData(await apiFetch<PageResponse<Product>>(`/api/products?${params}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading products");
    }
  }, [page, search, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(p: Product) {
    try {
      await apiFetch(`/api/products/${p.id}/active?value=${!p.active}`, { method: "PATCH" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error toggling product active status");
    }
  }

  async function stockIn(p: Product) {
    const input = prompt(`Enter quantity to add to stock for "${p.name}"?`);
    if (!input) return;
    const quantity = Number(input);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a positive integer");
      return;
    }
    try {
      await apiFetch(`/api/inventory/products/${p.id}/stock-in`, {
        method: "POST",
        body: JSON.stringify({ quantity, reason: "Stock in" }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error adding stock");
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {canManage && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            + Add Product
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by Name / SKU / Barcode"
          className="flex-1 rounded border p-2"
        />
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
          className="rounded border p-2"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3">Status</th>
              {canManage && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.content.map((p) => (
              <tr key={p.id} className={`border-t ${p.active ? "" : "opacity-50"}`}>
                <td className="p-3 font-mono">{p.sku}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.categoryName ?? "—"}</td>
                <td className="p-3 text-right">{money(p.price)}</td>
                <td className="p-3 text-right">
                  <span className={p.lowStock ? "font-bold text-red-600" : ""}>
                    {p.stockQuantity}
                  </span>
                  {p.lowStock && <span className="ml-1 text-xs text-red-600">⚠ Low Stock</span>}
                </td>
                <td className="p-3">{p.active ? "Active" : "Inactive"}</td>
                {canManage && (
                  <td className="space-x-3 p-3">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-blue-600">
                      Edit
                    </button>
                    <button onClick={() => stockIn(p)} className="text-green-700">
                      + Stock
                    </button>
                    <button onClick={() => toggleActive(p)} className="text-gray-600">
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {data && data.content.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">No products found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span>Page {data.page + 1} / {data.totalPages} (Total {data.totalElements})</span>
          <button
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </main>
  );
}