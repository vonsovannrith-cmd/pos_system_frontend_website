"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const me = useMe();

  const canManage =
    me?.role === "ADMIN" || me?.role === "MANAGER";

  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ---------- Load Categories ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<Category[]>("/api/categories");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error loading categories",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setLoading(true);

      try {
        const data = await apiFetch<Category[]>("/api/categories");

        if (!cancelled) {
          setItems(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error loading categories",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Add Category ----------

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const categoryName = name.trim();

    if (!categoryName) {
      setError("Please enter a category name");
      return;
    }

    if (adding) return;

    setAdding(true);
    setError("");
    setMessage("");

    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryName,
          description: null,
        }),
      });

      setName("");
      setMessage("Category added successfully ✅");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error adding category",
      );
    } finally {
      setAdding(false);
    }
  }

  // ---------- Delete Category ----------

  async function remove(category: Category) {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the category "${category.name}"?`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setError("");
    setMessage("");

    try {
      await apiFetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      setMessage(
        `Category "${category.name}" deleted successfully ✅`,
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error removing category",
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ---------- Loading User ----------

  if (!me) {
    return (
      <p className="p-8">
        Loading user information...
      </p>
    );
  }

  // ---------- UI ----------

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Categories
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage store product categories
          </p>
        </div>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
          {items.length} Categories
        </span>
      </div>

      {/* Error Message */}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Success Message */}

      {message && (
        <div
          role="status"
          className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {/* Add Category Form */}

      {canManage && (
        <form
          onSubmit={add}
          className="mb-6 flex flex-col gap-2 rounded-xl bg-white p-4 shadow sm:flex-row"
        >
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
              setMessage("");
            }}
            placeholder="New Category Name"
            className="min-w-0 flex-1 rounded border p-2 outline-none focus:border-blue-500"
            required
            maxLength={100}
            disabled={adding}
          />

          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="rounded bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "Adding..." : "+ Add Category"}
          </button>
        </form>
      )}

      {/* Category List */}

      <div className="overflow-hidden rounded-xl bg-white shadow">

        <div className="border-b bg-gray-50 p-3 font-semibold">
          Category List
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading categories...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No categories found
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 p-4 transition hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {category.name}
                  </p>

                  <p className="text-xs text-gray-400">
                    Category ID: {category.id}
                  </p>
                </div>

                {canManage && (
                  <button
                    type="button"
                    disabled={
                      deletingId !== null ||
                      loading
                    }
                    onClick={() => remove(category)}
                    className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === category.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

    </main>
  );
}