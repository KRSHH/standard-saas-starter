import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle, UserMenu } from "@/components/dashboard/user-menu";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { siteConfig } from "@/lib/site";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold">
              {siteConfig.name.charAt(0)}
            </div>
            <span className="text-base font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu
              email={user.email ?? ""}
              fullName={user.user_metadata?.full_name}
            />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
