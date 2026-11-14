import { expect, test } from "@playwright/test";
import { adminApi, createProduct, stockOf } from "./helpers/api";

test.use({ storageState: "e2e/.auth/cashier.json" });

// Default VAT requirement of 10% (New database) → $1.00 + $0.10 = $1.10
test("cashier scans a barcode, pays in cash, gets a receipt and stock drops", async ({ page }) => {
  const api = await adminApi();
  const product = await createProduct(api, { price: 1.0, stock: 5 });

  await page.goto("/dashboard/pos");

// Barcode Scanner = Type numbers + Enter
  const search = page.getByPlaceholder("Search or scan barcode (Enter)");
  await search.fill(product.barcode);
  await search.press("Enter");

  const cart = page.getByRole("complementary");
  await expect(cart.getByText(product.name)).toBeVisible();

  await cart.getByRole("button", { name: "Exact" }).click();
  await cart.getByRole("button", { name: /^Pay \$1\.10$/ }).click();

  const receipt = page.locator("#receipt");
  await expect(receipt).toContainText("INV-");
  await expect(receipt).toContainText("$1.10");

  await expect.poll(() => stockOf(api, product.id)).toBe(4);   // Stock drops from 5 to 4
  await api.dispose();
});

test("a cart can be put on hold and resumed", async ({ page }) => {
  const api = await adminApi();
  const product = await createProduct(api, { price: 2.0, stock: 3 });
  const label = `Held ${Date.now()}`;

  await page.goto("/dashboard/pos");
  const search = page.getByPlaceholder("Search or scan barcode (Enter)");
  await search.fill(product.barcode);
  await search.press("Enter");

  page.once("dialog", (dialog) => dialog.accept(label));        // window.prompt for the cart label
  await page.getByRole("button", { name: "⏸ Hold cart" }).click();
  await expect(page.getByText("Cart is empty")).toBeVisible();

  await page.getByRole("button", { name: /On hold \(\d+\)/ }).click();
  await page.getByRole("listitem").filter({ hasText: label }).getByRole("button", { name: "Resume" }).click();

  await expect(page.getByRole("complementary").getByText(product.name)).toBeVisible();
  await api.dispose();
});