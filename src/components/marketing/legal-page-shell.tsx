import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";

type LegalPageShellProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-18 max-w-350 items-center px-5 sm:px-8 lg:px-12">
          <Brand />
          <Button asChild variant="ghost" size="sm" className="ml-auto gap-2">
            <Link href="/">
              <ArrowLeft className="size-3.5" /> Home
            </Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Legal · Draft placeholder
        </p>
        <h1 className="mt-5 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {lastUpdated}. Replace bracketed placeholders before
          relying on this document.
        </p>
        <div className="prose prose-neutral mt-10 max-w-none text-sm leading-7 text-foreground prose-headings:font-heading prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-6 prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground">
          {children}
        </div>
      </article>

      <MarketingFooter />
    </main>
  );
}
