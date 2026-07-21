import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  JsonLd,
  organizationSchema,
  websiteSchema,
} from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* JSON-LD: Organization + WebSite for rich Google results */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center md:py-32">
        <Badge variant="secondary" className="rounded-full">
          Production-ready · Batteries included
        </Badge>
        <h1 className="text-foreground max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
          Ship your SaaS in days, not weeks
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-balance">
          {siteConfig.name} is a Next.js SaaS template with auth, billing, AI,
          observability, and a hardened security baseline — so you can skip the
          plumbing and build your product.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/features">See what&apos;s included</Link>
          </Button>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-muted/30 border-y">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-3">
          <PillarCard
            icon={<ShieldCheck className="size-5" />}
            title="Secure by default"
            description="Strict CSP with per-request nonces, RLS on every table, webhook signature verification, and rate limiting."
            href="/features"
          />
          <PillarCard
            icon={<Zap className="size-5" />}
            title="Full stack, wired"
            description="Supabase auth, Drizzle + Postgres, Razorpay + Stripe billing, Resend email, AI SDK, PostHog, Sentry."
            href="/features"
          />
          <PillarCard
            icon={<Layers className="size-5" />}
            title="Production-tested"
            description="Typecheck, lint, unit + E2E tests, and CI out of the box. Every route compiles before you touch it."
            href="/features"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
        <h2 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
          Start building today
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Clone, configure, and ship. No credit card required to run locally.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/auth/sign-up">
            Get started <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

function PillarCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-primary/50 flex flex-col gap-3 rounded-xl border p-6 transition-colors"
    >
      <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
        {icon}
      </div>
      <h3 className="text-foreground text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </Link>
  );
}
