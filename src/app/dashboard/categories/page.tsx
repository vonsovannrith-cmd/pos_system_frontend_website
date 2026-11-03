"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const me = useMe();
  const canManage = me?.role === "ADMIN" || me?.role === "MANAGER";

  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<Category[]>("/api/categories"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading categories");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name, description: null }),
      });
      setName("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error adding category");
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete "${c.name}" ?`)) return;
    setError("");
    try {
      await apiFetch(`/api/categories/${c.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error removing category");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Categories</h1>

      {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}

      {canManage && (
        <form onSubmit={add} className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New Category Name"
            className="flex-1 rounded border p-2"
            required
          />
          <button className="rounded bg-blue-600 px-4 text-white">Add Category</button>
        </form>
      )}

      <ul className="divide-y rounded bg-white shadow">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            <span>{c.name}</span>
            {canManage && (
              <button onClick={() => remove(c)} className="text-sm text-red-600">
                Delete
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="p-3 text-gray-500">No categories found</li>}
      </ul>
    </main>
  );
}