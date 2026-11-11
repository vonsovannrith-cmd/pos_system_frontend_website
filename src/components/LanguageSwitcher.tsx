
"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const options = [
  { code: "km", label: "ខ្មែរ" },
  { code: "en", label: "EN" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [pending, startTransition] = useTransition();

  function change(code: "km" | "en") {
    if (code === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: code });
    });
  }

  return (
    <div
      className={`flex overflow-hidden rounded border text-xs ${
        pending ? "opacity-50" : ""
      }`}
    >
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          disabled={pending}
          onClick={() => change(option.code)}
          className={`px-2 py-1 ${
            locale === option.code
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
