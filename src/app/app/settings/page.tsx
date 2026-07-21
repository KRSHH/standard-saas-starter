import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Settings",
  description: "Manage your account settings",
  path: "/app/settings",
  noIndex: true,
});

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and preferences.
        </p>
      </div>
      {/* Settings form to be implemented in Slice 1 (account). */}
      <div className="text-muted-foreground mt-12 text-center text-sm">
        Settings coming soon.
      </div>
    </div>
  );
}
