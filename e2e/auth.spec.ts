import { test, expect } from "@playwright/test";

/**
 * Account-lifecycle surface — the public flows that don't require a live
 * Supabase instance. Tests cover route reachability, form validation,
 * navigation wiring, and the auth gate. End-to-end happy paths (real signup,
 * email delivery, OAuth redirect) are integration concerns and live outside
 * this template's unit/E2E suite.
 */

test.describe("public auth surface", () => {
  test("sign-in page renders with forgot-password + sign-up links", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    // Forgot-password link is new — must point to the new route.
    await expect(
      page.getByRole("link", { name: /forgot password/i }),
    ).toHaveAttribute("href", "/forgot-password");
    // Sign-up link must NOT be the broken /auth/sign-up.
    const signUpLink = page.getByRole("link", { name: /^sign up$/i });
    await expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  test("sign-up page links to sign-in (correct href)", async ({ page }) => {
    await page.goto("/sign-up");
    const signInLink = page.getByRole("link", { name: /^sign in$/i });
    await expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  test("forgot-password page renders and links back to sign-in", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /reset your password/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to sign in/i }),
    ).toHaveAttribute("href", "/sign-in");
  });

  test("reset-password page renders the new-password form", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: /choose a new password/i }),
    ).toBeVisible();
    // Two fields share "new password" in their labels — target by exact text.
    await expect(
      page.getByLabel("New password", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Confirm new password", { exact: true }),
    ).toBeVisible();
  });

  test("check-email page renders after sign-up intent", async ({ page }) => {
    await page.goto("/check-email");
    await expect(
      page.getByRole("heading", { name: /check your email/i }),
    ).toBeVisible();
  });

  test("all public auth routes return 200", async ({ request }) => {
    for (const path of [
      "/sign-in",
      "/sign-up",
      "/forgot-password",
      "/reset-password",
      "/check-email",
    ]) {
      const r = await request.get(path);
      expect(r.status(), `${path} should be 200`).toBe(200);
    }
  });
});

test.describe("auth gate", () => {
  test("unauthed user hitting /app/settings redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("redirect preserves the original path", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/redirect=.*app%2Fsettings/);
  });
});

test.describe("sign-in form validation", () => {
  test("shows inline errors for empty submit", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Email + password fields both surface validation messages.
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    await expect(
      page.getByText(/password must be at least 8 characters/i),
    ).toBeVisible();
  });
});
