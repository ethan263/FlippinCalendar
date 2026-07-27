import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Headphones,
  Sparkles,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Brand } from "@/components/brand";
import { HeroSection } from "@/components/marketing/hero-section";
import { Button } from "@/components/ui/button";
import { marketingPlans, pricingPeriodLabel } from "@/lib/marketing/plans";

const plans = marketingPlans.map((plan) => ({
  name: plan.name,
  price: plan.price,
  copy: plan.copy ?? plan.description ?? "",
  features: plan.features,
  featured: plan.featured,
}));

function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-350 items-center px-5 sm:px-8 lg:px-12">
        <Brand />
        <nav className="ml-12 hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link className="transition-colors hover:text-foreground" href="#trimr">
            Trimr
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#built-for">
            Built for
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/pricing">
            Pricing
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!signedIn ? (
            <>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-none">
              <Link href="/sign-up">
                Start free <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            </>
          ) : (
            <>
            <Button asChild size="sm" className="gap-1.5 shadow-none">
              <Link href="/app">
                Open workspace <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <UserButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="overflow-hidden bg-background">
      <MarketingNav signedIn={Boolean(userId)} />

      <HeroSection />

      <section id="trimr" className="mx-auto max-w-350 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">One system, three surfaces</p>
            <h2 className="mt-4 max-w-md font-heading text-5xl font-medium leading-[0.96] tracking-tighter sm:text-6xl">
              The front desk finally has a back office.
            </h2>
          </div>
          <div className="grid border-t md:grid-cols-3">
            {[
              { icon: CalendarDays, n: "01", title: "Operations", copy: "Bookings, availability, offerings, contacts, and the people who deliver the work." },
              { icon: Bot, n: "02", title: "Web agent", copy: "An ElevenLabs concierge that knows the organization and can help visitors take action." },
              { icon: Headphones, n: "03", title: "Browser audio", copy: "A live voice conversation in the public page, powered by the same organization context." },
            ].map(({ icon: Icon, n, title, copy }) => (
              <article key={n} className="border-b border-r px-0 py-8 pr-7 md:px-7 md:first:pl-0 md:last:border-r-0">
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-primary" />
                  <span className="font-mono text-[10px] text-muted-foreground">{n}</span>
                </div>
                <h3 className="mt-12 font-heading text-3xl font-medium tracking-[-0.035em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="built-for" className="border-y bg-[#171b24] text-white">
        <div className="mx-auto grid max-w-350 lg:grid-cols-2">
          <div className="border-b border-white/10 px-5 py-20 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-28">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-300">Not a vertical template</p>
            <h2 className="mt-5 max-w-xl font-heading text-5xl font-medium leading-[0.96] tracking-tighter sm:text-6xl">
              Your business defines the nouns.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/58">
              A salon calls it a treatment. A consultant calls it a session. A
              support team calls it a case. Trimr’s terminology, forms,
              availability, and public page adapt without changing the core.
            </p>
          </div>
          <div className="grid grid-cols-2">
            {[
              ["Barbers & salons", "Service · Stylist · Appointment"],
              ["Studios & coaches", "Session · Coach · Booking"],
              ["Clinics & practices", "Visit · Practitioner · Patient"],
              ["Tech support", "Case · Specialist · Customer"],
            ].map(([title, vocabulary], index) => (
              <div key={title} className="min-h-48 border-b border-r border-white/10 p-6 last:border-b-0 sm:p-8 even:border-r-0">
                <span className="font-mono text-[9px] text-white/30">0{index + 1}</span>
                <h3 className="mt-10 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/45">{vocabulary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-350 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Feature-based plans</p>
            <h2 className="mt-4 max-w-3xl font-heading text-5xl font-medium tracking-tighter text-balance sm:text-6xl">
              Start useful. Add a voice. Plan for every feature.
            </h2>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Compare plans <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="grid border-l border-t lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative flex min-h-107.5 flex-col border-b border-r p-7 sm:p-9 ${plan.featured ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              {plan.featured ? <span className="absolute right-5 top-5 font-mono text-[9px] uppercase tracking-[0.15em] text-primary-foreground/65">Most popular</span> : null}
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">{plan.name}</p>
              <p className="mt-8 font-heading text-6xl font-medium tracking-[-0.06em]">
                {plan.price}
                <span className="ml-1 font-sans text-xs font-normal tracking-normal opacity-60">
                  {pricingPeriodLabel}
                </span>
              </p>
              <p className="mt-4 max-w-xs text-sm leading-6 opacity-65">{plan.copy}</p>
              <div className="mt-9 space-y-3 border-t border-current/15 pt-6">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm"><Check className="size-3.5" /> {feature}</p>
                ))}
              </div>
              <Button asChild variant={plan.featured ? "secondary" : "outline"} className="mt-auto h-11 justify-between rounded-md shadow-none">
                <Link href="/sign-up">Choose {plan.name}<ArrowRight className="size-4" /></Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t bg-[#dce6ff]">
        <div className="mx-auto flex max-w-350 flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
          <div>
            <Sparkles className="size-6 text-primary" />
            <h2 className="mt-6 max-w-3xl font-heading text-5xl font-medium leading-[0.94] tracking-tighter sm:text-7xl">Give your team their time back.</h2>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 gap-2 rounded-md px-6 shadow-none">
            <Link href="/sign-up">Start with Core <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-350 flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <Brand />
          <p className="sm:ml-auto">One intelligent front desk for every organization.</p>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
