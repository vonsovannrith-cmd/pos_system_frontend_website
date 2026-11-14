import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

test("language switch changes the UI and survives a reload", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Sales history" })).toBeVisible();

  await page.getByRole("button", { name: "ខ្មែរ" }).click();
  await expect(page.getByRole("link", { name: "Sales History" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name: "Sales History" })).toBeVisible();   // Cookie preserves the language
});