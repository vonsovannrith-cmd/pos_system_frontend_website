import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./config";
import fs from "fs";
import path from "path";

export default getRequestConfig(async () => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  
  // Validate Cookie or Locale value
  const locale: Locale = (locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : defaultLocale;

  // កំណត់ Path ឱ្យត្រូវទៅនឹង src/messages/ យ៉ាងត្រឹមត្រូវ
  const filePath = path.join(process.cwd(), `src/messages/${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(filePath, "utf8"));

  return {
    locale,
    messages,
  };
});