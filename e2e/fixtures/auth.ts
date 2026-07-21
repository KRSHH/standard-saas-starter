/* eslint-disable react-hooks/rules-of-hooks -- `use` here is Playwright's fixture API, not a React hook */
import { test as base, type Page } from "@playwright/test";

/**
 * Authenticated test fixture.
 *
 * Mocks the Supabase auth session at the network layer so E2E tests can
 * exercise /app/* routes without real credentials. The mock matches the
 * shape @supabase/ssr expects from /auth/v1/user.
 *
 * Usage:
 *   import { test, expect } from "./fixtures/auth";
 *   test("dashboard loads", async ({ authedPage }) => {
 *     await authedPage.goto("/app");
 *     ...
 *   });
 */

const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "e2e@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "E2E User" },
  created_at: new Date().toISOString(),
};

type AuthFixtures = {
  authedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    // Intercept Supabase auth calls — return a valid session.
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
    await page.route(`${supabaseUrl}/auth/v1/user`, (route) => {
      route.fulfill({ json: MOCK_USER });
    });
    await page.route(`${supabaseUrl}/auth/v1/**`, (route) => {
      route.fulfill({ json: MOCK_USER });
    });

    // Prime the auth cookie that updateSession reads.
    await page.context().addCookies([
      {
        name: "sb-access-token",
        value: "mock-access-token",
        domain: "localhost",
        path: "/",
      },
    ]);

    await use(page);
  },
});

export { expect } from "@playwright/test";
