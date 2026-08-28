import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { MetricBar, TechnicalLabel } from "./shared";

export function HeroSection() {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative overflow-hidden border-b border-primary bg-background px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24"
    >
      <TechnicalLabel className="left-12 top-10">SHOWCASE READY</TechnicalLabel>
      <TechnicalLabel className="right-12 top-10">2026 / INDIA</TechnicalLabel>
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <header className="max-w-2xl pt-8 sm:pt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Personal Inflation / 01
          </p>
          <h1
            id="landing-hero-title"
            className="mt-5 max-w-3xl text-balance text-5xl font-extrabold uppercase leading-[0.98] tracking-[-0.04em] text-primary sm:text-6xl lg:text-[72px]"
          >
            Inflation isn&apos;t the same for everyone.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            INFLORA turns your financial transactions into a personalized view of
            inflation, showing how the prices that matter to you are actually
            moving.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard?mode=showcase">
                Explore INFLORA
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <li className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              AA powered
            </li>
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Read-only
            </li>
            <li className="inline-flex items-center gap-2">
              <LockKeyhole className="h-3.5 w-3.5 text-primary" />
              Consent first
            </li>
          </ul>
        </header>

        <HeroDashboard />
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <aside
      aria-label="Personal inflation dashboard preview"
      className="relative border border-primary/20 bg-surface p-4 lg:p-8"
    >
      <TechnicalLabel className="left-0 -top-12 bg-card">
        Account Aggregator
      </TechnicalLabel>
      <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
        <article className="border border-border p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Personal Inflation
          </p>
          <p className="mt-3 font-mono text-5xl font-semibold text-primary">
            6.82%
          </p>
          <p className="mt-2 font-mono text-sm text-primary">
            +2.37 pp above India&apos;s CPI
          </p>
          <div className="mt-8 space-y-4">
            <MetricBar label="Personal Inflation" value="6.82%" width="88%" />
            <MetricBar label="Headline CPI" value="4.45%" width="58%" muted />
          </div>
        </article>
        <div className="space-y-4">
          <article className="border border-border p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Headline CPI
            </p>
            <p className="mt-3 font-mono text-3xl font-semibold">4.45%</p>
          </article>
          <article className="border border-border p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Top Driver
            </p>
            <p className="mt-3 text-sm font-semibold">Food</p>
            <p className="font-mono text-sm text-primary">+0.92 pp</p>
          </article>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2 border border-border p-4">
        {["Food", "Transport", "Healthcare", "Shopping"].map((category) => (
          <li key={category}>
            <Badge variant="secondary">
              {category}
            </Badge>
          </li>
        ))}
      </ul>
    </aside>
  );
}
