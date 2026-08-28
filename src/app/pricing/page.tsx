import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Brand } from "@/components/brand";
import { getAppAuthSession } from "@/lib/auth/require-app-session";
import { Button } from "@/components/ui/button";
import { marketingPlans, pricingPeriodLabel } from "@/lib/marketing/plans";
import { buildPlanChoiceHref } from "@/lib/marketing/plan-intent";

export default async function PricingPage() {
  const { userId, orgSlug } = await getAppAuthSession();

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-18 max-w-350 items-center px-5 sm:px-8 lg:px-12">
          <Brand />
          <Button asChild variant="ghost" size="sm" className="ml-auto gap-2">
            <Link href={userId ? "/app" : "/"}>
              <ArrowLeft className="size-3.5" /> {userId ? "Workspace" : "Home"}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-350 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Plans that unlock capabilities
          </p>
          <h1 className="mt-5 font-heading text-6xl font-medium leading-[0.92] tracking-[-0.055em] sm:text-7xl">
            Run the desk for free. Add AI where it matters.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Each plan belongs to a business. Paid upgrades checkout securely
            through PayFast in ZAR.
          </p>
        </div>

        <div className="grid border-l border-t lg:grid-cols-2">
          {marketingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`flex min-h-102.5 flex-col border-b border-r p-8 ${plan.featured ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
                {plan.name}
              </p>
              <p className="mt-8 font-heading text-6xl tracking-[-0.06em]">
                {plan.price}
                <span className="ml-1 font-sans text-xs tracking-normal opacity-60">
                  {pricingPeriodLabel}
                </span>
              </p>
              <p className="mt-4 text-sm leading-6 opacity-65">{plan.description}</p>
              <div className="mt-8 space-y-3 border-t border-current/15 pt-6">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5" /> {feature}
                  </p>
                ))}
              </div>
              <Button
                asChild
                variant={plan.featured ? "secondary" : "outline"}
                className="mt-auto shadow-none"
              >
                <a
                  href={buildPlanChoiceHref({
                    planKey: plan.key,
                    signedIn: Boolean(userId),
                    orgSlug,
                  })}
                >
                  Choose {plan.name}
                </a>
              </Button>
            </article>
          ))}
        </div>

        {userId && orgSlug ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Manage your current plan in{" "}
            <Link href={`/app/${orgSlug}/billing`} className="text-primary underline">
              Billing
            </Link>
            .
          </p>
        ) : (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Create your account first, then upgrade from the in-app billing screen.
          </p>
        )}
      </section>
    </main>
  );
}
