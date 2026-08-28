import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";

export function AuthShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-[max(4rem,env(safe-area-inset-bottom))] pt-2 sm:px-10">
        <div className="w-full max-w-[440px]">
          {title ? (
            <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
              {title}
            </h1>
          ) : null}
          {children}
        </div>
      </div>
    </main>
  );
}
