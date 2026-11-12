"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { apiFetch } from "@/lib/api";

type AuthResponse = {
  token: string;
  fullName: string;
  email: string;
  role: string;
};

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Call login API (Cookie is set automatically by the server)
      await apiFetch<AuthResponse>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      // Navigate to dashboard while preserving the current locale
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">

      {/* Language Switcher */}
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-center text-2xl font-bold">
          {t("title")}
        </h1>

        <p className="text-center text-sm text-gray-500">
          {t("subtitle")}
        </p>

        {error && (
          <div className="rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-2"
          required
        />

        <input
          type="password"
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border p-2"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 p-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </main>
  );
}