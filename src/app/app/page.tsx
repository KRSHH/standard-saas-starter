import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Your dashboard",
  path: "/app",
  noIndex: true,
});

export default async function AppDashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back
          {user.user_metadata?.full_name
            ? `, ${user.user_metadata.full_name.split(" ")[0]}`
            : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what&apos;s happening with your account.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Plan</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              Free trial
              <Badge variant="secondary" className="text-xs">
                14 days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href="/app/billing">Upgrade</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Profile completeness</CardDescription>
            <CardTitle className="text-xl">0%</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/app/organization">Complete profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Visibility</CardDescription>
            <CardTitle className="text-xl">Public</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/app/organization">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
