"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Settings } from "@/types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    apiFetch<Settings>("/api/settings").then(setSettings).catch(() => {});
  }, []);

  return settings;
}