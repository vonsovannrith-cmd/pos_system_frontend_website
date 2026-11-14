import { expect, test } from "@playwright/test";
import { ADMIN, API, BASE } from "./helpers/api";
import { loginViaUi } from "./helpers/ui";

test.describe("authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });     // Do not use the saved session.
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: BASE }]);
  });

  test("anonymous users are redirected to the login page", async ({ page }) => {
    await page.goto("/dashboard/pos");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/login");
// Random email to avoid hitting the rate limit on the actual account
    await page.getByPlaceholder("Email").fill(`nobody.${Date.now()}@pos.com`);
    await page.getByPlaceholder("Password").fill("Wrong1234");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Incorrect")).toBeVisible();   // Backend Message (Khmer)
    await expect(page).toHaveURL(/\/login/);
  });

  test("the session token is invisible to JavaScript", async ({ page, context }) => {
    await loginViaUi(page, ADMIN);

    const auth = (await context.cookies()).find((c) => c.name === "POS_AUTH");
    expect(auth?.httpOnly).toBe(true);
    expect(auth?.sameSite).toBe("Strict");

    expect(await page.evaluate(() => document.cookie)).not.toContain("POS_AUTH");
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  });

  test("logging out invalidates the token server-side", async ({ page, context, request }) => {
    await loginViaUi(page, ADMIN);
    const token = (await context.cookies()).find((c) => c.name === "POS_AUTH")!.value;

// Cookie is valid before logout
    const before = await request.get(`${BASE}/api/auth/me`, { headers: { Cookie: `POS_AUTH=${token}` } });
    expect(before.status()).toBe(200);

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login/);
 
// Same Replay Token → Must be rejected (requires 4K)
    const after = await request.get(`${BASE}/api/auth/me`, { headers: { Cookie: `POS_AUTH=${token}` } });
    expect(after.status()).toBe(401);
  });
});