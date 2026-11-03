"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { Me } from "@/types";

export function useMe() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
        }
      });
  }, [router]);

  return me;
}