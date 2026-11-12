
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const t = useTranslations("categories");
  const me = useMe();

  const canManage =
    me?.role === "ADMIN" || me?.role === "MANAGER";

  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiFetch<Category[]>("/api/categories");
      setItems(data);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("genericError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t("nameRequired"));
      return;
    }

    setError("");
    setSaving(true);

    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: null,
        }),
      });

      setName("");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("genericError")
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(t("deleteConfirm", { name: c.name }))) {
      return;
    }

    setError("");

    try {
      await apiFetch(`/api/categories/${c.id}`, {
        method: "DELETE",
      });

      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("genericError")
      );
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">
        {t("title")}
      </h1>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {canManage && (
        <form onSubmit={add} className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("newPlaceholder")}
            className="min-w-0 flex-1 rounded border p-2"
            required
            maxLength={100}
            disabled={saving}
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 text-white disabled:opacity-50"
          >
            {saving ? t("saving") : t("add")}
          </button>
        </form>
      )}

      <ul className="divide-y rounded bg-white shadow">
        {loading ? (
          <li className="p-3 text-gray-500">
            {t("loading")}
          </li>
        ) : items.length === 0 ? (
          <li className="p-3 text-gray-500">
            {t("empty")}
          </li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between p-3"
            >
              <span>{c.name}</span>

              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t("delete")}
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
