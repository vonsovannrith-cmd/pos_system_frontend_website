"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AppUser } from "@/types";

type Props = {
  user: AppUser | null; // null = create new
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
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold">{user ? "Edit Staff" : "Add New Staff"}</h2>

        {error && <div className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</div>}

        <label className="block text-sm">
          Full Name
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
            Initial Password
            <input type="password" className={inputClass} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <span className="text-xs text-gray-500">8–72 characters with letters and numbers</span>
          </label>
        )}

        <label className="block text-sm">
          Role
          <select className={inputClass} value={form.role} disabled={isSelf}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="CASHIER">CASHIER: POS sales only</option>
            <option value="MANAGER">MANAGER: Manage products/reports</option>
            <option value="ADMIN">ADMIN: Full access</option>
          </select>
        </label>

        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} disabled={isSelf}
              onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active Account (Can Login)
          </label>
        )}
        {isSelf && <p className="text-xs text-gray-500">You cannot change your own role or disable your own account</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}