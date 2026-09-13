import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Globe,
  MessageCircle,
  Mic,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { getAppAuthSession } from "@/lib/auth/require-app-session";
import { HeroSection } from "@/components/marketing/hero-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";

/* ─── Nav ─── */

function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-350 items-center px-5 sm:px-8 lg:px-12">
        <Brand />
        <nav className="ml-12 hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link className="transition-colors hover:text-foreground" href="#features">
            Features
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#how-it-works">
            How it works
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
            <Button asChild size="sm" className="gap-1.5 shadow-none">
              <Link href="/app">
                Open workspace <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Features grid ─── */

const features = [
  {
    icon: MessageCircle,
    title: "AI concierge",
    description:
      "A text and voice agent answers questions, greets visitors, and books appointments — using your hours, team, and brand.",
  },
  {
    icon: CalendarDays,
    title: "Online booking",
    description:
      "Customers pick a service, choose a time, and confirm — no phone calls. Your team sees everything in real time.",
  },
  {
    icon: UsersRound,
    title: "Team scheduling",
    description:
      "Add team members, assign services, and manage individual availability rules. No double-bookings.",
  },
  {
    icon: Globe,
    title: "Branded public page",
    description:
      "A beautiful page with your logo, colours, services, hours, and booking flow — ready to share.",
  },
  {
    icon: Clock3,
    title: "Availability rules",
    description:
      "Set weekly hours per team member. Buffers, slot intervals, and advance booking limits keep things sane.",
  },
  {
    icon: Mic,
    title: "Voice agent",
    description:
      "Let visitors talk to your AI concierge in the browser. Powered by ElevenLabs — natural, fast, multilingual.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="border-b bg-background">
      <div className="mx-auto max-w-350 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Everything you need
          </p>
          <h2 className="mt-5 font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            One desk for bookings, team, and AI.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            No juggling spreadsheets, WhatsApp groups, and phone calls.
            flippinCalendar gives your business a single front desk that works
            while you sleep.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group rounded-xl border border-black/8 bg-card p-6 transition-colors hover:border-primary/30"
              >
                <div className="grid size-10 place-items-center rounded-lg border border-black/10 bg-[#f7f5ef]">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ─── */

const steps = [
  {
    number: "01",
    title: "Create your workspace",
    description:
      "Sign up, name your business, set your timezone and currency. Your personal workspace is ready in seconds.",
  },
  {
    number: "02",
    title: "Add your services and team",
    description:
      "Define offerings with durations and prices. Add team members and set their weekly availability.",
  },
  {
    number: "03",
    title: "Publish your page",
    description:
      "Customise your public site with your brand, colours, and content. Hit publish — your booking page is live.",
  },
  {
    number: "04",
    title: "Let AI handle the rest",
    description:
      "Your AI concierge greets visitors, answers questions, and books appointments — text or voice, 24/7.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-b bg-accent">
      <div className="mx-auto max-w-350 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mt-5 font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            From sign-up to live bookings in minutes.
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <article key={step.number}>
              <span className="font-mono text-3xl font-semibold tracking-[-0.06em] text-primary/25">
                {step.number}
              </span>
              <h3 className="mt-3 font-heading text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Built for ─── */

const audiences = [
  "Barbershops, salons, and spas",
  "Clinics, therapists, and coaches",
  "Tutors, trainers, and instructors",
  "Repair shops, studios, and freelancers",
  "Any small business that takes appointments",
];

function BuiltForSection() {
  return (
    <section id="built-for" className="border-b bg-background">
      <div className="mx-auto grid max-w-350 items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-28">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Built for
          </p>
          <h2 className="mt-5 font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            Service businesses that want more time and fewer missed calls.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            If your business runs on appointments, flippinCalendar gives you a
            professional booking page, an AI concierge, and a team dashboard —
            without the enterprise price tag.
          </p>
        </div>

        <div className="rounded-xl border border-black/8 bg-card p-8">
          <ul className="space-y-4">
            {audiences.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/5">
                  <Check className="size-3.5 text-primary" />
                </span>
                <span className="text-sm leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing preview ─── */

function PricingPreviewSection() {
  return (
    <section className="border-b bg-accent">
      <div className="mx-auto max-w-350 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Pricing
          </p>
          <h2 className="mt-5 font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            Free to start. Everything included.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            All features are unlocked for every workspace — no plans, no
            paywalls, no billing. Just sign up and go.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-xl border border-primary/20 bg-card">
          <div className="bg-primary p-6 text-primary-foreground">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
              Everything
            </p>
            <p className="mt-3 font-heading text-5xl tracking-[-0.06em]">
              R0
              <span className="ml-1 font-sans text-xs tracking-normal opacity-60">
                / forever
              </span>
            </p>
          </div>
          <div className="space-y-3 p-6">
            {[
              "AI receptionist — text and voice concierge",
              "Online booking, team scheduling, and messaging",
              "Public site with your own branding",
              "Real-time availability and bookings",
            ].map((feature) => (
              <p key={feature} className="flex items-center gap-2 text-sm">
                <Check className="size-3.5 text-primary" /> {feature}
              </p>
            ))}
            <Button asChild className="mt-4 w-full shadow-none">
              <Link href="/sign-up">Get started free</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground">
            See full pricing details →
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ─── Page ─── */

export default async function Home() {
  const { userId } = await getAppAuthSession();

  return (
    <main className="marketing-home overflow-hidden bg-background">
      <MarketingNav signedIn={Boolean(userId)} />

      <HeroSection />

      <FeaturesSection />

      <HowItWorksSection />

      <BuiltForSection />

      <PricingPreviewSection />

      <section className="border-t bg-accent">
        <div className="mx-auto flex max-w-350 flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
          <div>
            <Sparkles className="size-6 text-primary" />
            <h2 className="mt-6 max-w-3xl font-heading text-5xl font-semibold leading-[0.94] tracking-tighter sm:text-7xl">
              Give your team time back.
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-7 text-muted-foreground">
              Set up your AI front desk in under five minutes. Free to start, no card needed.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 gap-2 rounded-md px-6 shadow-none">
            <Link href="/sign-up">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}