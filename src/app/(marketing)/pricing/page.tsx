import { Check } from "lucide-react";

import { buildMetadata } from "@/lib/seo";
import { PLANS } from "@/lib/payments/plans";

export const metadata = buildMetadata({
  title: "Pricing",
  description:
    "Simple, transparent pricing. A 14-day free trial on every plan. Cancel anytime.",
  path: "/pricing",
});

export default function PricingPage() {
  const plans = Object.values(PLANS);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Pricing that scales with you
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Flat, transparent pricing. {`14-day`} free trial on every plan. Cancel
          anytime.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
        {plans.map((plan, i) => (
          <PlanCard key={plan.slug} plan={plan} highlighted={i === 1} />
        ))}
      </div>

      <p className="text-muted-foreground mt-10 text-center text-sm">
        Prices in USD. {`14-day`} free trial. No credit card required to start.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  highlighted = false,
}: {
  plan: (typeof PLANS)[keyof typeof PLANS];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`bg-card relative flex flex-col gap-6 rounded-2xl p-8 ${
        highlighted ? "border-primary border-2" : "border"
      }`}
    >
      {highlighted && (
        <div className="bg-primary text-primary-foreground absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-medium">
          Most popular
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{plan.name}</h2>
        <p className="text-muted-foreground text-sm">{plan.description}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold">${plan.priceUsd}</span>
        <span className="text-muted-foreground">/month</span>
      </div>
      <ul className="text-muted-foreground flex flex-col gap-3 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="text-primary size-4 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
