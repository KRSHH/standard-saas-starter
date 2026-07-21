import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Organization",
  description: "Manage your organization profile",
  path: "/app/organization",
  noIndex: true,
});

export default function OrganizationPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground text-sm">
          Build your public profile. Higher completeness = better discovery.
        </p>
      </div>
      {/* Form to be implemented in Slice 2 (profile builder). */}
      <div className="text-muted-foreground mt-12 text-center text-sm">
        Profile builder coming soon.
      </div>
    </div>
  );
}
