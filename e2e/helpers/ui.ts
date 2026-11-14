import { expect, type Page } from "@playwright/test";

export async function loginViaUi(page: Page, creds: { email: string; password: string }) {
  await page.goto("en/login");
  await page.getByPlaceholder("Email").fill(creds.email);
  await page.getByPlaceholder("Password").fill(creds.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
}