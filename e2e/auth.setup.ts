import { test as setup } from "@playwright/test";
import fs from "node:fs";
import { ADMIN, BASE, CASHIER, adminApi, ensureCashier } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";

fs.mkdirSync("e2e/.auth", { recursive: true });

async function useEnglish(context: import("@playwright/test").BrowserContext) {
// Test using English text to keep the selector constant
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: BASE }]);
}

setup("admin session", async ({ page, context }) => {
  const api = await adminApi();
  await ensureCashier(api);
  await api.dispose();

  await useEnglish(context);
  await loginViaUi(page, ADMIN);
  await context.storageState({ path: "e2e/.auth/admin.json" });
});

setup("cashier session", async ({ page, context }) => {
  await useEnglish(context);
  await loginViaUi(page, CASHIER);
  await context.storageState({ path: "e2e/.auth/cashier.json" });
});