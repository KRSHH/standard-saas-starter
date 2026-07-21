/**
 * DB seed — populates dev/test data. Run with: `bun run db:seed`
 *
 * Creates: two profiles, matching subscriptions (trialing), and one
 * organization each. Safe to re-run (idempotent via upsert / on-conflict).
 *
 * Requires: DATABASE_URL set, migration 0001 applied.
 */
import "dotenv/config";

import { db } from "@/db";
import { profiles, subscriptions, organizations } from "@/db/schema";
import { PLANS } from "@/lib/payments/plans";
import { TRIAL_DAYS } from "@/lib/payments/plans";

const SEED_PROFILES = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "alice@example.com",
    fullName: "Alice Adams",
    planSlug: "starter" as const,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "bob@example.com",
    fullName: "Bob Baker",
    planSlug: "pro" as const,
  },
];

async function seed() {
  console.log("Seeding…");

  for (const p of SEED_PROFILES) {
    await db
      .insert(profiles)
      .values({ id: p.id, email: p.email, fullName: p.fullName })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { email: p.email, fullName: p.fullName },
      });
    console.log(`  ✓ profile ${p.email}`);

    const plan = PLANS[p.planSlug];
    await db
      .insert(subscriptions)
      .values({
        userId: p.id,
        plan: plan.slug,
        status: "trialing",
        provider: "stripe",
        amountCents: plan.priceCents,
        currency: plan.currency,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
        ),
      })
      .onConflictDoNothing();
    console.log(`  ✓ subscription (${plan.slug})`);
  }

  await db
    .insert(organizations)
    .values({
      ownerId: SEED_PROFILES[0]!.id,
      name: "Acme Labs",
      slug: "acme-labs",
      visibility: "public",
      description: "Building the future of developer tools.",
    })
    .onConflictDoNothing({ target: organizations.slug });
  console.log("  ✓ organization: Acme Labs");

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
