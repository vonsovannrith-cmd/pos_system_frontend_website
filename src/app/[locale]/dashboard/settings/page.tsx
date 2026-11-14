"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import type { Settings } from "@/types";

const inputClass = "mt-1 w-full rounded border p-2";

type SettingsForm = {
  storeName: string;
  address: string;
  phone: string;
  taxRate: string;
  usdToKhr: string;
  defaultLowStockThreshold: string;
};

const initialForm: SettingsForm = {
  storeName: "",
  address: "",
  phone: "",
  taxRate: "",
  usdToKhr: "",
  defaultLowStockThreshold: "",
};

export default function SettingsPage() {
  const t = useTranslations("settings");

  const me = useMe();
  const isAdmin = me?.role === "ADMIN";

  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        const settings = await apiFetch<Settings>("/api/settings");

        if (cancelled) return;

        setForm({
          storeName: settings.storeName ?? "",
          address: settings.address ?? "",
          phone: settings.phone ?? "",
          taxRate: String(settings.taxRate ?? ""),
          usdToKhr: String(settings.usdToKhr ?? ""),
          defaultLowStockThreshold: String(
            settings.defaultLowStockThreshold ?? "",
          ),
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [t]);

  // Handle form changes
  function handleChange(key: keyof SettingsForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  // Save settings
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    const taxRate = Number(form.taxRate);
    const usdToKhr = Number(form.usdToKhr);
    const lowStockThreshold = Number(form.defaultLowStockThreshold);

    // VAT validation
    if (
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      setError(t("invalidVat"));
      return;
    }

    // Exchange rate validation
    if (!Number.isFinite(usdToKhr) || usdToKhr <= 0) {
      setError(t("invalidExchangeRate"));
      return;
    }

    // Low stock validation
    if (
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      setError(t("invalidLowStock"));
      return;
    }

    setSaving(true);

    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          storeName: form.storeName.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          taxRate,
          usdToKhr,
          defaultLowStockThreshold: lowStockThreshold,
        }),
      });

      setMessage(t("saveSuccess"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  // Loading user
  if (!me) {
    return (
      <p className="p-8">{t("loadingUser")}</p>
    );
  }

  // Admin only
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            ← {t("backToDashboard") || "Back to Dashboard"}
          </Link>
        </div>
        <p className="p-8 text-red-600">
          {t("adminOnly")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      {/* Navigation / Back to Dashboard Link */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
        >
          ← {t("backToDashboard") || "Back to Dashboard"}
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-bold">
        {t("title")}
      </h1>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Success */}
      {message && (
        <div
          role="status"
          className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {loading ? (
        <p className="py-6">{t("loadingSettings")}</p>
      ) : (
        <form
          onSubmit={save}
          className="space-y-4 rounded-xl bg-white p-6 shadow"
        >
          {/* Store Name */}
          <label className="block text-sm">
            {t("storeName")}

            <input
              className={inputClass}
              value={form.storeName}
              onChange={(e) =>
                handleChange("storeName", e.target.value)
              }
              required
              maxLength={150}
            />
          </label>

          {/* Address */}
          <label className="block text-sm">
            {t("address")}

            <input
              className={inputClass}
              value={form.address}
              onChange={(e) =>
                handleChange("address", e.target.value)
              }
              maxLength={255}
            />
          </label>

          {/* Phone */}
          <label className="block text-sm">
            {t("phone")}

            <input
              type="tel"
              className={inputClass}
              value={form.phone}
              onChange={(e) =>
                handleChange("phone", e.target.value)
              }
              maxLength={30}
            />
          </label>

          {/* VAT and Exchange Rate */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              {t("vat")}

              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
                value={form.taxRate}
                onChange={(e) =>
                  handleChange("taxRate", e.target.value)
                }
                required
              />
            </label>

            <label className="block text-sm">
              {t("exchangeRate")}

              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
                value={form.usdToKhr}
                onChange={(e) =>
                  handleChange("usdToKhr", e.target.value)
                }
                required
              />
            </label>
          </div>

          {/* Low Stock Threshold */}
          <label className="block text-sm">
            {t("lowStockThreshold")}

            <input
              type="number"
              min="0"
              step="1"
              className={inputClass}
              value={form.defaultLowStockThreshold}
              onChange={(e) =>
                handleChange(
                  "defaultLowStockThreshold",
                  e.target.value,
                )
              }
              required
            />
          </label>

          {/* VAT Note */}
          <p className="text-xs text-gray-500">
            {t("vatNote")}
          </p>

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-blue-600 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </form>
      )}
    </main>
  );
}