import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Shared layout primitives for legal pages. Keeps prose styling consistent
 * across Privacy / Terms / Cookies / Contact without repeating Tailwind
 * classes per page. Underscore prefix keeps this file out of routing.
 */

export function LegalPageHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
      {children}
    </h1>
  );
}

export function LegalLastUpdated({ date }: { date: string }) {
  return (
    <p className="text-muted-foreground mt-2 text-sm">Last updated: {date}</p>
  );
}

// Prose typography via child selectors — no @tailwindcss/typography plugin
// required. Scoped to <LegalArticle> so it doesn't leak to other pages.
const proseClasses = [
  "text-foreground/90 mt-8 space-y-4",
  "[&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold",
  "[&_p]:text-base [&_p]:leading-relaxed",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
];

export function LegalArticle({ children }: { children: React.ReactNode }) {
  return (
    <article className={cn(...proseClasses)}>
      {children}
      <footer className="text-muted-foreground border-t pt-6 text-sm">
        © {new Date().getFullYear()} {siteConfig.name}
      </footer>
    </article>
  );
}
