"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AppUser } from "@/types";

type Props = {
  user: AppUser | null; // null = បង្កើតថ្មី
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass = "mt-1 w-full rounded border p-2 disabled:bg-gray-100";

export default function UserForm({ user, isSelf, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "CASHIER",
    active: user?.active ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (user) {
        await apiFetch(`/api/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify({ fullName: form.fullName, role: form.role, active: form.active }),
        });
      } else {
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
      setError(err instanceof Error ? err.message : "មានបញ្ហា");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold">{user ? "កែបុគ្គលិក" : "បន្ថែមបុគ្គលិកថ្មី"}</h2>

        {error && <div className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</div>}

        <label className="block text-sm">
          ឈ្មោះពេញ
          <input className={inputClass} value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </label>

        <label className="block text-sm">
          Email
          <input type="email" className={inputClass} value={form.email} disabled={!!user}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>

        {!user && (
          <label className="block text-sm">
            Password ដំបូង
            <input type="password" className={inputClass} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <span className="text-xs text-gray-500">8–72 តួ មានអក្សរ និងលេខ</span>
          </label>
        )}

        <label className="block text-sm">
          Role
          <select className={inputClass} value={form.role} disabled={isSelf}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="CASHIER">CASHIER: លក់ប៉ុណ្ណោះ</option>
            <option value="MANAGER">MANAGER: គ្រប់គ្រងទំនិញ/របាយការណ៍</option>
            <option value="ADMIN">ADMIN: គ្រប់យ៉ាង</option>
          </select>
        </label>

        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} disabled={isSelf}
              onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            គណនីសកម្ម (អាច Login)
          </label>
        )}
        {isSelf && <p className="text-xs text-gray-500">មិនអាចប្តូរ Role ឬបិទគណនីខ្លួនឯងបានទេ</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2">បោះបង់</button>
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
            {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      </form>
    </div>
  );
}