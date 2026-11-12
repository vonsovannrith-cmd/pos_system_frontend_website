"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { apiFetch } from "@/lib/api";
import type { AppUser } from "@/types";

type Props = {
  user: AppUser | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass = "mt-1 w-full rounded border p-2 disabled:bg-gray-100";

export default function UserForm({ user, isSelf, onClose, onSaved }: Props) {
  const t = useTranslations("userForm");

  // ---------- Form State ----------

  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "CASHIER",
    active: user?.active ?? true,
  });

  // ---------- UI States ----------

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // ---------- Submit Form ----------

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (user) {
        // Update Existing User

        await apiFetch(`/api/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify({
            fullName: form.fullName,
            role: form.role,
            active: form.active,
          }),
        });
      } else {
        // Create New User

        await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            role: form.role,
          }),
        });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  // ---------- UI ----------

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-lg"
      >
        {/* Form Title */}

        <h2 className="text-xl font-bold">
          {user ? t("editTitle") : t("addTitle")}
        </h2>

        {/* Error Message */}

        {error && (
          <div className="rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Full Name */}

        <label className="block text-sm">
          {t("fullName")}

          <input
            type="text"
            className={inputClass}
            value={form.fullName}
            onChange={(e) =>
              setForm({
                ...form,
                fullName: e.target.value,
              })
            }
            required
          />
        </label>

        {/* Email */}

        <label className="block text-sm">
          {t("email")}

          <input
            type="email"
            className={inputClass}
            value={form.email}
            disabled={!!user}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            required
          />
        </label>

        {/* Initial Password */}

        {!user && (
          <label className="block text-sm">
            {t("password")}

            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              minLength={8}
              maxLength={72}
              required
            />

            <span className="text-xs text-gray-500">{t("passwordHint")}</span>
          </label>
        )}

        {/* Role */}

        <label className="block text-sm">
          {t("role")}

          <select
            className={inputClass}
            value={form.role}
            disabled={isSelf}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value,
              })
            }
          >
            <option value="CASHIER">{t("roles.CASHIER")}</option>

            <option value="MANAGER">{t("roles.MANAGER")}</option>

            <option value="ADMIN">{t("roles.ADMIN")}</option>
          </select>
        </label>

        {/* Active Account */}

        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              disabled={isSelf}
              onChange={(e) =>
                setForm({
                  ...form,
                  active: e.target.checked,
                })
              }
            />

            {t("activeAccount")}
          </label>
        )}

        {/* Self Account Warning */}

        {isSelf && <p className="text-xs text-gray-500">{t("selfWarning")}</p>}

        {/* Form Buttons */}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            {t("cancel")}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
