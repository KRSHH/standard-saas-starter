import { expect, test } from "@playwright/test";

test.describe("Marketing site", () => {
  test("homepage loads and shows hero CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /ship your saas in days, not weeks/i,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: /get started/i })
        .first(),
    ).toBeVisible();
  });

  test("pricing page shows both plans with USD pricing", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("$19")).toBeVisible();
    await expect(page.getByText("$49")).toBeVisible();
  });

  test("unknown route shows 404", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
  });
});

test.describe("Auth flow", () => {
  test("sign-in page renders the auth form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("protected /app redirects to sign-in when logged out", async ({
    page,
  }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
