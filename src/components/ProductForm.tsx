"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Category, Product } from "@/types";

type Props = {
  product: Product | null; // null = បង្កើតថ្មី, មាន = កែ
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

const inputClass = "mt-1 w-full rounded border p-2";

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    price: product ? String(product.price) : "",
    costPrice: product ? String(product.costPrice) : "0",
    lowStockThreshold: product ? String(product.lowStockThreshold) : "",
    categoryId: product?.categoryId ? String(product.categoryId) : "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || null,
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      lowStockThreshold: form.lowStockThreshold === "" ? null : Number(form.lowStockThreshold),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
    };

    try {
      await apiFetch(product ? `/api/products/${product.id}` : "/api/products", {
        method: product ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold">{product ? "Edit Product" : "Add New Product"}</h2>

        {error && <div className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</div>}

        <label className="block text-sm">
          Product Name
          <input className={inputClass} value={form.name} onChange={set("name")} required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            SKU
            <input className={inputClass} value={form.sku} onChange={set("sku")} required />
          </label>
          <label className="block text-sm">
            Barcode
            <input className={inputClass} value={form.barcode} onChange={set("barcode")} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Selling Price ($)
            <input
              type="number" step="0.01" min="0"
              className={inputClass} value={form.price} onChange={set("price")} required
            />
          </label>
          <label className="block text-sm">
            Cost Price ($)
            <input
              type="number" step="0.01" min="0"
              className={inputClass} value={form.costPrice} onChange={set("costPrice")}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Low Stock Threshold
            <input
              type="number" min="0"
              className={inputClass} value={form.lowStockThreshold} onChange={set("lowStockThreshold")}
            />
          </label>
          <label className="block text-sm">
            Category
            <select className={inputClass} value={form.categoryId} onChange={set("categoryId")}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}