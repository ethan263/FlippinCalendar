import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Headphones, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuthShellMotionVideo } from "@/components/marketing/auth-shell-motion-video";
import { FlippingWord } from "@/components/marketing/flipping-word";

const signals = [
  { icon: Headphones, label: "Every conversation, answered" },
  { icon: CalendarCheck, label: "Every request, organized" },
  { icon: Sparkles, label: "Every business, its own" },
];

function AuthHeadline({
  className,
  as: Tag = "p",
}: {
  className?: string;
  as?: "h1" | "p";
}) {
  return (
    <Tag
      className={
        className ??
        "font-heading text-6xl font-medium leading-[0.94] tracking-[-0.05em] text-balance"
      }
    >
      Just book it on the <FlippingWord word="flippin'" intervalMs={2000} />{" "}
      calendar.
    </Tag>
  );
}

export function AuthShell({
  children,
  eyebrow,
  title,
  showMobileHeadline = true,
}: {
  children: ReactNode;
  eyebrow: string;
  title: ReactNode;
  showMobileHeadline?: boolean;
}) {
  return (
    <main className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,0.95fr)_minmax(min(100%,28rem),1.05fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden bg-[#151923] px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 hairline-grid opacity-[0.09]" />
        <div className="absolute -right-44 top-1/4 size-[460px] rounded-full border border-blue-300/20" />
        <div className="absolute -right-20 top-[34%] size-[250px] rounded-full border border-blue-300/15" />
        <Brand inverted className="relative z-10" />

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-blue-300">
            One business. Every front door.
          </p>
          {/* Decorative brand line — form column owns the document h1 via Clerk/title */}
          <AuthHeadline as="p" />

          <div className="mt-10">
            <AuthShellMotionVideo />
          </div>

          <div className="mt-10 grid gap-4">
            {signals.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="flex items-center gap-4 border-t border-white/12 pt-4"
              >
                <span className="font-mono text-[10px] text-white/35">
                  0{index + 1}
                </span>
                <Icon className="size-4 text-blue-300" aria-hidden="true" />
                <span className="text-sm text-white/78">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 max-w-md text-xs leading-5 text-white/45">
          Built for the way service businesses, studios, practices, and support
          teams actually work.
        </p>
      </section>

      <section className="flex min-h-dvh flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6">
          <Brand className="lg:hidden" />
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to the site
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-[max(4rem,env(safe-area-inset-bottom))] pt-4 sm:px-10">
          <div className="w-full max-w-[440px]">
            {showMobileHeadline ? (
              <div className="mb-8 lg:hidden">
                <AuthHeadline
                  as="p"
                  className="font-heading text-4xl font-medium leading-[0.96] tracking-[-0.04em] text-balance"
                />
              </div>
            ) : null}
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
            <h1 className="mb-8 mt-3 font-heading text-4xl font-medium tracking-[-0.04em] text-balance">
              {title}
            </h1>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
