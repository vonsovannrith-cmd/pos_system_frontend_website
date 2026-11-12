
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const inputClass = "mt-1 w-full rounded border p-2";

export default function AccountPage() {
  const t = useTranslations("account");
  const me = useMe();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (next !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    if (next.length < 8 || next.length > 72 || !/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) {
      setError(t("passwordInvalid"));
      return;
    }

    setSaving(true);

    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });

      setMessage(t("success"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("genericError")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-1 text-2xl font-bold">
        {t("title")}
      </h1>

      {me && (
        <p className="mb-4 text-sm text-gray-500">
          {me.fullName} · {me.email}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl bg-white p-6 shadow"
      >
        <label className="block text-sm">
          {t("currentPassword")}

          <input
            type="password"
            className={inputClass}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <label className="block text-sm">
          {t("newPassword")}

          <input
            type="password"
            className={inputClass}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />

          <span className="text-xs text-gray-500">
            {t("passwordHint")}
          </span>
        </label>

        <label className="block text-sm">
          {t("confirmPassword")}

          <input
            type="password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-blue-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          {saving ? t("saving") : t("changePassword")}
        </button>
      </form>
    </main>
  );
}
