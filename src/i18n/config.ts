
export const locales = ["km", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "km";

export const LOCALE_COOKIE = "NEXT_LOCALE";
