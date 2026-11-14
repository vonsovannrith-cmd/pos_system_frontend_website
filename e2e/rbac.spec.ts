import { expect, test } from "@playwright/test";

test.describe("cashier", () => {
  test.use({ storageState: "e2e/.auth/cashier.json" });

  test("does not see admin menus and cannot call admin APIs", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Products", exact: true })).toBeVisible();   // Nav ផ្ទុករួច

    for (const hidden of ["Reports", "Staff", "Settings"]) {
      await expect(page.getByRole("link", { name: hidden, exact: true })).toHaveCount(0);
    }

    await page.goto("/dashboard/users");
    await expect(page.getByText(/Admin ប៉ុណ្ណោះ/)).toBeVisible(); 
// Hiding the UI is not real protection. The backend must reject it.
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(403);
  });
});

test.describe("admin", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test("sees every menu", async ({ page }) => {
    await page.goto("/dashboard");
    for (const name of ["Reports", "Staff", "Settings", "Products"]) {
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    }
  });
});