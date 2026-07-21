import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            {siteConfig.name.charAt(0)}
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {siteConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/features"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-foreground hover:text-muted-foreground text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-bold">
            {siteConfig.name.charAt(0)}
          </div>
          <span className="text-sm font-medium">{siteConfig.name}</span>
        </div>
        <nav className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <a
            href={siteConfig.links.twitter}
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Twitter
          </a>
          <a
            href={siteConfig.links.github}
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} {siteConfig.name}.
        </p>
      </div>
    </footer>
  );
}
