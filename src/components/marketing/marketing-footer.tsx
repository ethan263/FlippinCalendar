import Link from "next/link";

import { Brand } from "@/components/brand";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-350 flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:px-8 lg:px-12">
        <Brand />
        <p className="sm:ml-auto">An AI front desk for every business.</p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
