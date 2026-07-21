import { SiteFooter, SiteHeader } from "@/components/marketing/site-nav";

/**
 * Legal pages share the marketing chrome (header + footer) so visitors can
 * navigate back to product pages. Same shell as (marketing).
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
