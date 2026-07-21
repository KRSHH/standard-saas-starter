import { buildMetadata } from "@/lib/seo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const metadata = buildMetadata({
  title: "Billing",
  description: "Manage your subscription",
  path: "/app/billing",
  noIndex: true,
});

export default function BillingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage your subscription and payment method.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Current plan</CardTitle>
          <CardDescription>
            You&apos;re on a free trial. Upgrade to keep your account active.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">Free trial</span>
            <span className="text-muted-foreground text-sm">
              Active until —
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              "Full feature access",
              "All integrations enabled",
              "Priority support",
            ].map((f) => (
              <div
                key={f}
                className="text-muted-foreground flex items-center gap-2 text-sm"
              >
                <CheckCircle2 className="size-4 text-green-600" />
                {f}
              </div>
            ))}
          </div>
          {/* Real checkout button will be wired in Slice 8 (monetization). */}
          <Button className="mt-2" data-testid="upgrade-button">
            Upgrade plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
