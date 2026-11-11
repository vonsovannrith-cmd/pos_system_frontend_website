"use client";

import { useEffect, useState } from "react";
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
  const me = useMe();
  const isAdmin = me?.role === "ADMIN";

  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
            err instanceof Error ? err.message : "Unable to load settings",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(key: keyof SettingsForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    const taxRate = Number(form.taxRate);
    const usdToKhr = Number(form.usdToKhr);
    const lowStockThreshold = Number(form.defaultLowStockThreshold);

    if (
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      setError("VAT must be between 0 and 100");
      return;
    }

    if (!Number.isFinite(usdToKhr) || usdToKhr <= 0) {
      setError("Exchange rate must be greater than 0");
      return;
    }

    if (
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      setError("Low stock threshold must be an integer of 0 or greater");
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

      setMessage("Saved successfully ✅");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save settings",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return <p className="p-8">Loading user information...</p>;
  }

  if (!isAdmin) {
    return (
      <p className="p-8 text-red-600">
        Only Admins can modify settings
      </p>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-4 text-2xl font-bold">Store Settings</h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {loading ? (
        <p className="py-6">Loading settings...</p>
      ) : (
        <form
          onSubmit={save}
          className="space-y-4 rounded-xl bg-white p-6 shadow"
        >
          <label className="block text-sm">
            Store Name
            <input
              className={inputClass}
              value={form.storeName}
              onChange={(e) => handleChange("storeName", e.target.value)}
              required
              maxLength={150}
            />
          </label>

          <label className="block text-sm">
            Address
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              maxLength={255}
            />
          </label>

          <label className="block text-sm">
            Phone Number
            <input
              type="tel"
              className={inputClass}
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              maxLength={30}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              VAT (%)
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
                value={form.taxRate}
                onChange={(e) => handleChange("taxRate", e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              1 USD = ? KHR
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
                value={form.usdToKhr}
                onChange={(e) => handleChange("usdToKhr", e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block text-sm">
            Default Low Stock Threshold
            <input
              type="number"
              min="0"
              step="1"
              className={inputClass}
              value={form.defaultLowStockThreshold}
              onChange={(e) =>
                handleChange("defaultLowStockThreshold", e.target.value)
              }
              required
            />
          </label>

          <p className="text-xs text-gray-500">
            Changing VAT only applies to <b>new</b> sales. Older receipts remain unchanged.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-blue-600 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}
    </main>
  );
}