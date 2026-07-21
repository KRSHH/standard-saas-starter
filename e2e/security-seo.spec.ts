import { test, expect } from "@playwright/test";

test.describe("Security headers", () => {
  test("CSP nonce + security headers present on responses", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const headers = response?.headers() ?? {};
    // CSP must be present and reference 'nonce-'
    expect(headers["content-security-policy"]).toContain("nonce-");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("webhook routes are excluded from middleware matcher", async ({
    request,
  }) => {
    // Webhook endpoints with no/bad signature should 401, not be CSP-gated.
    const r = await request.post("/api/webhooks/razorpay", {
      data: "{}",
      headers: { "content-type": "application/json" },
    });
    // No signature → 401 unauthorized (not 500, not CSP-blocked).
    expect([401, 400]).toContain(r.status());
  });
});

test.describe("SEO", () => {
  test("sitemap.xml lists public routes", async ({ request }) => {
    const r = await request.get("/sitemap.xml");
    const body = await r.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/pricing");
    expect(body).toContain("/features");
  });

  test("robots.txt allows marketing, disallows app + api", async ({
    request,
  }) => {
    const r = await request.get("/robots.txt");
    const body = await r.text();
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /app");
    expect(body).toContain("Disallow: /api");
    expect(body).toContain("Sitemap:");
  });

  test("manifest.webmanifest is valid JSON with required fields", async ({
    request,
  }) => {
    const r = await request.get("/manifest.webmanifest");
    const manifest = await r.json();
    expect(manifest.name).toBe("Acme");
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test("homepage has JSON-LD Organization structured data", async ({
    page,
  }) => {
    await page.goto("/");
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const joined = jsonLd.join("\n");
    expect(joined).toContain('"@type":"Organization"');
    expect(joined).toContain('"@type":"WebSite"');
  });
});
