"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";
import { Building2, LayoutDashboard, CreditCard, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/organization", label: "Organization", icon: Building2 },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 border-r md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold">
          {siteConfig.name.charAt(0)}
        </div>
        <span className="text-base font-semibold tracking-tight">
          {siteConfig.name}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
