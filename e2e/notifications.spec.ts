import { test, expect } from "@playwright/test";

/**
 * Notification surface — covers routes that don't need a live DB or auth
 * session. The valid-token happy path is exercised in
 * `src/lib/notifications/tokens.test.ts` (the crypto round-trip) plus a real
 * integration run against a live DB; here we cover the auth-gate and the
 * negative unsubscribe paths.
 */

test.describe("unsubscribe endpoint", () => {
  test("GET without a token returns 400", async ({ request }) => {
    const r = await request.get("/api/notifications/unsubscribe");
    expect(r.status()).toBe(400);
  });

  test("GET with a malformed token returns 400", async ({ request }) => {
    const r = await request.get(
      "/api/notifications/unsubscribe?token=not-a-real-token",
    );
    expect(r.status()).toBe(400);
  });

  test("GET with a token missing the signature returns 400", async ({
    request,
  }) => {
    const r = await request.get(
      "/api/notifications/unsubscribe?token=only-payload",
    );
    expect(r.status()).toBe(400);
  });

  test("POST without a token returns 400", async ({ request }) => {
    const r = await request.post("/api/notifications/unsubscribe", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    expect(r.status()).toBe(400);
  });
});

test.describe("notification API auth gate", () => {
  test("GET /api/notifications without a session returns 401 JSON", async ({
    request,
  }) => {
    const r = await request.get("/api/notifications");
    expect(r.status()).toBe(401);
    const body = await r.json().catch(() => null);
    expect(body?.error).toMatch(/unauthorized/i);
  });

  test("POST /api/notifications/read-all without a session returns 401", async ({
    request,
  }) => {
    const r = await request.post("/api/notifications/read-all");
    expect(r.status()).toBe(401);
  });

  test("POST /api/uploads without a session returns 401", async ({
    request,
  }) => {
    const r = await request.post("/api/uploads", {
      data: {
        kind: "avatars",
        contentType: "image/png",
        size: 1024,
        filename: "x.png",
      },
      headers: { "content-type": "application/json" },
    });
    expect(r.status()).toBe(401);
  });
});

test.describe("Resend webhook", () => {
  test("POST without svix headers returns 400", async ({ request }) => {
    const r = await request.post("/api/webhooks/resend", {
      data: "{}",
      headers: { "content-type": "application/json" },
    });
    expect(r.status()).toBe(400);
  });
});
