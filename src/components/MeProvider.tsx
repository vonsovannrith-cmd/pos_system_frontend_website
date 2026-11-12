"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { MeContext } from "@/lib/useMe";
import type { Me } from "@/types";

export default function MeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        // Fetch current user profile (Cookie is sent automatically)
        const result = await apiFetch<Me>("/api/auth/me");

        if (!cancelled) {
          setMe(result);
        }
      } catch (err) {
        if (cancelled) return;
        // If an error occurs (e.g. 401 Unauthorized), apiFetch or middleware will handle redirection to /login
        console.error("Failed to load user profile:", err);
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MeContext.Provider value={me}>
      {children}
    </MeContext.Provider>
  );
}