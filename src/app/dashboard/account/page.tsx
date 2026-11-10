"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const inputClass = "mt-1 w-full rounded border p-2";

export default function AccountPage() {
  const me = useMe();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (next !== confirm) {
      setError("Password ថ្មី និងការបញ្ជាក់មិនដូចគ្នា");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setMessage("ប្តូរ Password ជោគជ័យ ✅");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "មានបញ្ហា");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-1 text-2xl font-bold">ប្តូរ Password</h1>
      {me && <p className="mb-4 text-sm text-gray-500">{me.fullName} · {me.email}</p>}

      {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">{message}</div>}

      <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-6 shadow">
        <label className="block text-sm">
          Password បច្ចុប្បន្ន
          <input type="password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Password ថ្មី
          <input type="password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} required />
          <span className="text-xs text-gray-500">8–72 តួ មានអក្សរ និងលេខ</span>
        </label>
        <label className="block text-sm">
          បញ្ជាក់ Password ថ្មី
          <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        <button disabled={saving} className="w-full rounded bg-blue-600 py-2 font-semibold text-white disabled:opacity-50">
          {saving ? "កំពុងរក្សាទុក..." : "ប្តូរ Password"}
        </button>
      </form>
    </main>
  );
}