"use client";

import { useCallback, useEffect, useState } from "react";
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
  const me = useMe();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<AppUser[]>("/api/users"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
    }
  }, []);

  useEffect(() => {
    if (me?.role === "ADMIN") load();
  }, [me, load]);

  async function toggleActive(u: AppUser) {
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ fullName: u.fullName, role: u.role, active: !u.active }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "មានបញ្ហា");
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await apiFetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      setMessage(`បានកំណត់ Password ថ្មីឱ្យ ${resetTarget.fullName}។ សូមប្រាប់គាត់ឱ្យប្តូរវាបន្ទាប់ពី Login`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "មានបញ្ហា");
    }
  }

  if (!me) return <p className="p-8">កំពុងផ្ទុក...</p>;
  if (me.role !== "ADMIN") return <p className="p-8 text-red-600">តែ Admin ប៉ុណ្ណោះដែលអាចគ្រប់គ្រងបុគ្គលិក</p>;

  const kw = keyword.trim().toLowerCase();
  const filtered = users.filter((u) => `${u.fullName} ${u.email}`.toLowerCase().includes(kw));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">បុគ្គលិក</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          + បន្ថែមបុគ្គលិក
        </button>
      </div>

      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="ស្វែងរកតាមឈ្មោះ / Email"
        className="mb-4 w-full rounded border p-2"
      />

      {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">{message}</div>}

      <div className="overflow-x-auto rounded bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">ឈ្មោះ</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">ស្ថានភាព</th>
              <th className="p-3">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const self = u.email === me.email;
              return (
                <tr key={u.id} className={`border-t ${u.active ? "" : "opacity-50"}`}>
                  <td className="p-3">{u.fullName}{self && <span className="ml-1 text-xs text-gray-500">(ខ្ញុំ)</span>}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${roleStyle[u.role] ?? ""}`}>{u.role}</span>
                  </td>
                  <td className="p-3">{u.active ? "សកម្ម" : "ត្រូវបានបិទ"}</td>
                  <td className="space-x-3 p-3">
                    <button onClick={() => { setEditing(u); setShowForm(true); }} className="text-blue-600">កែ</button>
                    <button onClick={() => { setResetTarget(u); setNewPassword(""); setMessage(""); }} className="text-orange-600">
                      Reset Password
                    </button>
                    {!self && (
                      <button onClick={() => toggleActive(u)} className="text-gray-600">
                        {u.active ? "បិទ" : "បើក"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">មិនមានបុគ្គលិកទេ</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm
          user={editing}
          isSelf={editing?.email === me.email}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={resetPassword} className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold">Reset Password: {resetTarget.fullName}</h2>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password ថ្មី (8+ តួ, អក្សរ + លេខ)"
              className="w-full rounded border p-2"
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded border px-4 py-2">បោះបង់</button>
              <button className="rounded bg-orange-600 px-4 py-2 font-semibold text-white">កំណត់</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}