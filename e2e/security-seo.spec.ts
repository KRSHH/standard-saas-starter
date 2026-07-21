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
    // Legal routes are real pages now — they must be in the sitemap.
    expect(body).toContain("/privacy");
    expect(body).toContain("/terms");
    expect(body).toContain("/cookies");
    expect(body).toContain("/contact");
    // Routes that have no page must NOT appear (would point at a 404).
    expect(body).not.toContain("/blog");
    expect(body).not.toContain("/about");
  });

  test("legal routes resolve (not 404)", async ({ request }) => {
    for (const path of ["/privacy", "/terms", "/cookies", "/contact"]) {
      const r = await request.get(path);
      expect(r.status(), `${path} should be 200`).toBe(200);
    }
  });

  test("icon.svg is served", async ({ request }) => {
    const r = await request.get("/icon.svg");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/svg");
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
    // Name is env-driven; assert it is present and non-empty rather than a
    // hard-coded literal so the test survives a brand rename.
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    // Every declared icon src must resolve.
    for (const icon of manifest.icons) {
      const ir = await request.get(icon.src);
      expect(ir.status(), `${icon.src} should be 200`).toBe(200);
    }
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
