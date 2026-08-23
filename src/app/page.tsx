import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  DatabaseZap,
  FileText,
  KeyRound,
  Landmark,
  LockKeyhole,
  MoveRight,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Methodology", href: "#methodology" },
  { label: "Privacy", href: "#privacy" },
];

const trustItems = [
  ["01", "Account Aggregator"],
  ["02", "Transaction Intelligence"],
  ["03", "Personalized CPI"],
  ["04", "Privacy First"],
];

const processSteps = [
  {
    number: "01",
    title: "Connect",
    copy: "Securely connect financial accounts through India's Account Aggregator ecosystem.",
    icon: Landmark,
  },
  {
    number: "02",
    title: "Understand",
    copy: "INFLORA reads transaction data and identifies spending patterns.",
    icon: DatabaseZap,
  },
  {
    number: "03",
    title: "Categorize",
    copy: "Transactions are mapped into meaningful consumption categories.",
    icon: WalletCards,
  },
  {
    number: "04",
    title: "Calculate",
    copy: "Your spending weights are combined with CPI data to estimate personal inflation.",
    icon: BarChart3,
  },
];

const dashboardMetrics = [
  ["Personal Inflation", "6.82%"],
  ["Headline CPI", "4.45%"],
  ["Difference", "+2.37 pp ABOVE"],
  ["Eligible Spend", "INR 1,27,294"],
];

const drivers = [
  ["Food & Dining", "+8.4%", 92],
  ["Transport", "+6.1%", 70],
  ["Healthcare", "+5.2%", 58],
  ["Shopping", "+3.7%", 42],
];

const transactions = [
  ["12 Jul", "Swiggy", "Food", "-INR 684"],
  ["11 Jul", "Uber India", "Transport", "-INR 320"],
  ["09 Jul", "Apollo Pharmacy", "Healthcare", "-INR 780"],
  ["08 Jul", "Amazon", "Shopping", "-INR 2,199"],
];

const methodologyCards = [
  ["Your Spending", "What you actually consume.", WalletCards],
  [
    "Category Weights",
    "How important each category is in your basket.",
    ChartNoAxesColumnIncreasing,
  ],
  ["CPI Movement", "How prices are changing.", Banknote],
];

const privacyPoints = [
  "Consent-driven",
  "Read-only financial data",
  "No password sharing",
  "No storage of banking credentials",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-dashed border-border pb-4">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="INFLORA home"
          >
            <span className="grid h-9 w-9 place-items-center border border-dashed border-border bg-card">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.18em]">
                INFLORA
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Personal Inflation Intelligence
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground lg:flex">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Financial intelligence layer
            </div>
            <Button asChild variant="outline" className="border-dashed">
              <Link href="/dashboard?mode=showcase">Explore Dashboard</Link>
            </Button>
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden border border-dashed border-border bg-card px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
          <TechnicalLabel className="left-4 top-4">SHOWCASE READY</TechnicalLabel>
          <TechnicalLabel className="right-4 top-4">2026 / INDIA</TechnicalLabel>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="max-w-2xl pt-8 sm:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Personal Inflation / 01
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
                Inflation isn&apos;t the same for everyone.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                INFLORA turns your financial transactions into a personalized view
                of inflation, showing how the prices that matter to you are
                actually moving.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/dashboard?mode=showcase">
                    Explore INFLORA
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-dashed"
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  AA powered
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Read-only
                </span>
                <span className="inline-flex items-center gap-2">
                  <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                  Consent first
                </span>
              </div>
            </div>

            <HeroDashboard />
          </div>
        </section>

        <section className="grid border-x border-b border-dashed border-border bg-card md:grid-cols-4">
          {trustItems.map(([number, label], index) => (
            <div
              key={label}
              className={cn(
                "min-h-28 p-6",
                index < trustItems.length - 1 &&
                  "border-b border-dashed border-border md:border-b-0 md:border-r",
              )}
            >
              <p className="font-mono text-xs text-muted-foreground">{number}</p>
              <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 border-x border-b border-dashed border-border bg-background px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-16">
          <div>
            <SectionEyebrow>The Problem / 02</SectionEyebrow>
            <h2 className="mt-4 text-4xl font-semibold leading-none sm:text-5xl">
              4.45% inflation doesn&apos;t tell your story.
            </h2>
            <p className="mt-7 max-w-md text-2xl font-semibold leading-tight text-foreground">
              Headline CPI is an average. Your spending isn&apos;t.
            </p>
          </div>
          <div className="grid border border-dashed border-border bg-card md:grid-cols-[1fr_auto_1fr]">
            <ComparisonPanel
              label="Headline CPI"
              value="4.45%"
              copy="A generic national inflation figure."
            />
            <div className="flex items-center justify-center border-y border-dashed border-border p-6 md:border-x md:border-y-0">
              <div className="text-center font-mono">
                <p className="text-xl font-semibold text-primary">+2.37</p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  percentage points
                </p>
              </div>
            </div>
            <ComparisonPanel
              label="Your Inflation"
              value="6.82%"
              copy="Because your basket is different."
              emphasized
            />
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-x border-b border-dashed border-border bg-card px-5 py-10 sm:px-8 lg:px-12 lg:py-16"
        >
          <SectionEyebrow>The System / 03</SectionEyebrow>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <h2 className="max-w-xl text-4xl font-semibold leading-none sm:text-5xl">
              From transactions to personal inflation.
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              A consent-led data pipeline converts spending into CPI-linked
              weights, then compares your result with the national headline.
            </p>
          </div>
          <div className="mt-10 grid border border-dashed border-border md:grid-cols-4">
            {processSteps.map((step, index) => (
              <ProcessStep
                key={step.title}
                step={step}
                isLast={index === processSteps.length - 1}
              />
            ))}
          </div>
        </section>

        <section className="border-x border-b border-dashed border-border bg-background px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
          <SectionEyebrow>The Product / 04</SectionEyebrow>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <h2 className="text-4xl font-semibold leading-none sm:text-5xl">
                Your economy, at a glance.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
                The dashboard separates the AA connection state from the
                inflation result, so a successful data fetch never appears as a
                valid inflation estimate when categorization is insufficient.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" className="border-dashed">
                  <Link href="/dashboard?mode=showcase">
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section
          id="methodology"
          className="border-x border-b border-dashed border-border bg-card px-5 py-10 sm:px-8 lg:px-12 lg:py-16"
        >
          <SectionEyebrow>Methodology / 05</SectionEyebrow>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-4xl font-semibold leading-none sm:text-5xl">
                Not another spending tracker.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
                INFLORA does not simply show where your money went. It estimates
                how changes in the prices of the things you actually buy affect
                your personal cost of living.
              </p>
            </div>
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {methodologyCards.map(([title, copy, Icon]) => (
                  <Card
                    key={title as string}
                    className="rounded-sm border-dashed bg-background shadow-none"
                  >
                    <CardContent className="p-5">
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em]">
                        {title as string}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {copy as string}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="border border-dashed border-border bg-background p-5 font-mono text-sm text-foreground">
                <p className="text-muted-foreground">Personal Inflation</p>
                <p className="mt-3 text-lg">
                  = Sum (Your Category Weight x Category Inflation)
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="privacy"
          className="border-x border-b border-dashed border-border bg-background px-5 py-10 sm:px-8 lg:px-12 lg:py-16"
        >
          <SectionEyebrow>Privacy / 06</SectionEyebrow>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-4xl font-semibold leading-none sm:text-5xl">
                Your financial data should remain yours.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
                INFLORA is designed around India&apos;s Account Aggregator model:
                consent-based access to financial information, without password
                sharing or banking credential collection.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {privacyPoints.map((point) => (
                  <Badge
                    key={point}
                    variant="secondary"
                    className="border-dashed bg-card"
                  >
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
            <PrivacyDiagram />
          </div>
        </section>

        <section className="border-x border-b border-dashed border-border bg-card p-5 sm:p-8 lg:p-12">
          <div className="grid gap-8 border border-dashed border-border bg-background p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                INFLORA / Personal Inflation Intelligence
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-none">
                Know your inflation.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                Because the economy you experience is the economy you spend in.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard?mode=showcase">
                  Explore INFLORA
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-dashed"
              >
                <a href="#methodology">View methodology</a>
              </Button>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-6 border-x border-b border-dashed border-border bg-background px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em]">INFLORA</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Personal Inflation Intelligence
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
              <Link href="/dashboard?mode=showcase" className="hover:text-foreground">
                Product
              </Link>
              <a href="#methodology" className="hover:text-foreground">
                Methodology
              </a>
              <a href="#privacy" className="hover:text-foreground">
                Privacy
              </a>
              <Link href="/aa-test" className="hover:text-foreground">
                Live Account Aggregator
              </Link>
            </div>
          </div>
          <Separator className="border-dashed" />
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            (c) 2026 INFLORA
          </p>
        </footer>
      </div>
    </main>
  );
}

function HeroDashboard() {
  return (
    <div className="relative border border-dashed border-border bg-card p-4 shadow-[10px_10px_0_rgba(255,255,255,0.04)]">
      <TechnicalLabel className="-left-3 top-8 bg-card">
        Account Aggregator
      </TechnicalLabel>
      <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
        <div className="border border-dashed border-border p-5">
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
        </div>
        <div className="space-y-4">
          <div className="border border-dashed border-border p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Headline CPI
            </p>
            <p className="mt-3 font-mono text-3xl font-semibold">4.45%</p>
          </div>
          <div className="border border-dashed border-border p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Top Driver
            </p>
            <p className="mt-3 text-sm font-semibold">Food</p>
            <p className="font-mono text-sm text-primary">+0.92 pp</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border border-dashed border-border p-4">
        {["Food", "Transport", "Healthcare", "Shopping"].map((category) => (
          <Badge key={category} variant="secondary" className="border-dashed">
            {category}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="border border-dashed border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {dashboardMetrics.map(([label, value]) => (
          <div key={label} className="border border-dashed border-border p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 font-mono text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border border-dashed border-border p-5">
          <p className="text-sm font-semibold">Top Drivers</p>
          <div className="mt-5 space-y-4">
            {drivers.map(([label, value, width]) => (
              <div key={label as string}>
                <div className="flex justify-between text-sm">
                  <span>{label as string}</span>
                  <span className="font-mono">{value as string}</span>
                </div>
                <div className="mt-2 h-2 bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-dashed border-border p-5">
          <p className="text-sm font-semibold">Transaction Activity</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr className="border-b border-dashed border-border">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(([date, description, category, amount]) => (
                  <tr
                    key={`${date}-${description}`}
                    className="border-b border-dashed border-border"
                  >
                    <td className="py-3 font-mono text-xs text-muted-foreground">
                      {date}
                    </td>
                    <td className="py-3 font-medium">{description}</td>
                    <td className="py-3 text-muted-foreground">{category}</td>
                    <td className="py-3 text-right font-mono">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyDiagram() {
  const nodes = [
    ["User", Sparkles],
    ["Consent", KeyRound],
    ["Account Aggregator", BadgeCheck],
    ["Financial Information Provider", Landmark],
    ["INFLORA", FileText],
  ];

  return (
    <div className="border border-dashed border-border bg-card p-5">
      <div className="grid gap-3">
        {nodes.map(([label, Icon], index) => (
          <div key={label as string}>
            <div className="flex items-center gap-4 border border-dashed border-border p-4">
              <span className="grid h-9 w-9 place-items-center border border-dashed border-border">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.14em]">
                {label as string}
              </span>
            </div>
            {index < nodes.length - 1 ? (
              <div className="flex h-5 items-center justify-center">
                <MoveRight className="h-4 w-4 rotate-90 text-muted-foreground" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessStep({
  step,
  isLast,
}: {
  step: (typeof processSteps)[number];
  isLast: boolean;
}) {
  const Icon = step.icon;
  return (
    <div
      className={cn(
        "relative min-h-64 p-6",
        !isLast &&
          "border-b border-dashed border-border md:border-b-0 md:border-r",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground">{step.number}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em]">
        {step.title}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{step.copy}</p>
      {!isLast ? (
        <MoveRight className="absolute bottom-5 right-5 hidden h-4 w-4 text-muted-foreground md:block" />
      ) : null}
    </div>
  );
}

function MetricBar({
  label,
  value,
  width,
  muted,
}: {
  label: string;
  value: string;
  width: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between gap-4 font-mono text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 bg-muted">
        <div
          className={cn("h-full bg-primary", muted && "bg-muted-foreground")}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ComparisonPanel({
  label,
  value,
  copy,
  emphasized,
}: {
  label: string;
  value: string;
  copy: string;
  emphasized?: boolean;
}) {
  return (
    <div className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-6 font-mono text-5xl font-semibold",
          emphasized && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-5 text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

function TechnicalLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute border border-dashed border-border bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
