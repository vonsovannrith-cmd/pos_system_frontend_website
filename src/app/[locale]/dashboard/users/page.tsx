
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import UserForm from "@/components/UserForm";
import type { AppUser } from "@/types";

const roleStyle: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  CASHIER: "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const t = useTranslations("users");

  const me = useMe();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Load users
  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<AppUser[]>("/api/users"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
    }
  }, [t]);

  useEffect(() => {
    if (me?.role === "ADMIN") {
      load();
    }
  }, [me, load]);

  // Enable / Disable user
  async function toggleActive(u: AppUser) {
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: u.fullName,
          role: u.role,
          active: !u.active,
        }),
      });

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
    }
  }

  // Reset password
  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!resetTarget) return;

    try {
      await apiFetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });

      setMessage(
        t("resetSuccess", { name: resetTarget.fullName }),
      );

      setResetTarget(null);
      setNewPassword("");
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("genericError"),
      );
    }
  }

  // Loading
  if (!me) {
    return <p className="p-8">{t("loading")}</p>;
  }

  // Admin only
  if (me.role !== "ADMIN") {
    return (
      <p className="p-8 text-red-600">
        {t("adminOnly")}
      </p>
    );
  }

  // Search users
  const kw = keyword.trim().toLowerCase();

  const filtered = users.filter((u) =>
    `${u.fullName} ${u.email}`.toLowerCase().includes(kw),
  );

  return (
    <main className="mx-auto max-w-5xl p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("title")}
        </h1>

        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
            setError("");
            setMessage("");
          }}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          + {t("add")}
        </button>
      </div>

      {/* Search */}
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="mb-4 w-full rounded border p-2"
      />

      {/* Error */}
      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">{t("colName")}</th>
              <th className="p-3">{t("colEmail")}</th>
              <th className="p-3">{t("colRole")}</th>
              <th className="p-3">{t("colStatus")}</th>
              <th className="p-3">{t("colActions")}</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => {
              const self = u.email === me.email;

              return (
                <tr
                  key={u.id}
                  className={`border-t ${u.active ? "" : "opacity-50"}`}
                >
                  {/* Name */}
                  <td className="p-3">
                    {u.fullName}

                    {self && (
                      <span className="ml-1 text-xs text-gray-500">
                        ({t("you")})
                      </span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="p-3">{u.email}</td>

                  {/* Role */}
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        roleStyle[u.role] ?? ""
                      }`}
                    >
                      {t(`roles.${u.role}`)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    {u.active
                      ? t("statusActive")
                      : t("statusDisabled")}
                  </td>

                  {/* Actions */}
                  <td className="space-x-3 p-3">
                    <button
                      onClick={() => {
                        setEditing(u);
                        setShowForm(true);
                        setError("");
                        setMessage("");
                      }}
                      className="text-blue-600"
                    >
                      {t("edit")}
                    </button>

                    <button
                      onClick={() => {
                        setResetTarget(u);
                        setNewPassword("");
                        setMessage("");
                        setError("");
                      }}
                      className="text-orange-600"
                    >
                      {t("resetPassword")}
                    </button>

                    {!self && (
                      <button
                        onClick={() => toggleActive(u)}
                        className="text-gray-600"
                      >
                        {u.active
                          ? t("disable")
                          : t("enable")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Empty */}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-gray-500"
                >
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Form */}
      {showForm && (
        <UserForm
          user={editing}
          isSelf={editing?.email === me.email}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={resetPassword}
            className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 shadow-lg"
          >
            <h2 className="text-lg font-bold">
              {t("resetTitle", {
                name: resetTarget.fullName,
              })}
            </h2>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("newPasswordPlaceholder")}
              className="w-full rounded border p-2"
              required
              minLength={8}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword("");
                }}
                className="rounded border px-4 py-2"
              >
                {t("cancel")}
              </button>

              <button
                type="submit"
                className="rounded bg-orange-600 px-4 py-2 font-semibold text-white"
              >
                {t("reset")}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
