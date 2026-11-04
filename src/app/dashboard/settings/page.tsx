
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
            err instanceof Error ? err.message : "មិនអាចផ្ទុកការកំណត់បានទេ",
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
      setError("VAT ត្រូវតែមានតម្លៃចន្លោះពី 0 ដល់ 100");
      return;
    }

    if (!Number.isFinite(usdToKhr) || usdToKhr <= 0) {
      setError("អត្រាប្តូរប្រាក់ត្រូវតែធំជាង 0");
      return;
    }

    if (
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      setError("កម្រិតស្តុកទាបត្រូវតែជាចំនួនគត់ចាប់ពី 0 ឡើងទៅ");
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

      setMessage("បានរក្សាទុករួចរាល់ ✅");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "មិនអាចរក្សាទុកការកំណត់បានទេ",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return <p className="p-8">កំពុងផ្ទុកព័ត៌មានអ្នកប្រើប្រាស់...</p>;
  }

  if (!isAdmin) {
    return (
      <p className="p-8 text-red-600">
        តែ Admin ប៉ុណ្ណោះដែលអាចកែ Settings
      </p>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-4 text-2xl font-bold">ការកំណត់ហាង</h1>

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
        <p className="py-6">កំពុងផ្ទុកការកំណត់...</p>
      ) : (
        <form
          onSubmit={save}
          className="space-y-4 rounded-xl bg-white p-6 shadow"
        >
          <label className="block text-sm">
            ឈ្មោះហាង
            <input
              className={inputClass}
              value={form.storeName}
              onChange={(e) => handleChange("storeName", e.target.value)}
              required
              maxLength={150}
            />
          </label>

          <label className="block text-sm">
            អាសយដ្ឋាន
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              maxLength={255}
            />
          </label>

          <label className="block text-sm">
            លេខទូរស័ព្ទ
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
              1 USD = ? រៀល
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
            កម្រិតព្រមានស្តុកទាបលំនាំដើម
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
            ការប្តូរ VAT មានប្រសិទ្ធភាពសម្រាប់ការលក់ <b>ថ្មី</b> ប៉ុណ្ណោះ។
            វិក្កយបត្រចាស់នៅដដែល។
          </p>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-blue-600 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </form>
      )}
    </main>
  );
}