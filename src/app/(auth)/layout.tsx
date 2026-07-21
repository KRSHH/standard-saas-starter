import Link from "next/link";

import { siteConfig } from "@/lib/site";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2"
        aria-label={`${siteConfig.name} home`}
      >
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
          D
        </div>
        <span className="text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </span>
      </Link>
      {children}
    </div>
  );
}
