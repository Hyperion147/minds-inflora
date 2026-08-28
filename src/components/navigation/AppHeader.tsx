"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, Bell, ChartNoAxesCombined, FileText, Lightbulb, LogOut, Menu, Search, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type AppNavigationItem = {
  label: string;
  href: string;
};

type AppHeaderProps = {
  items: readonly AppNavigationItem[];
  homeHref?: string;
  desktopActions?: ReactNode;
  mobileAccessory?: ReactNode;
  mobileContent?: ReactNode;
  variant?: "default" | "dashboard";
  navigationSuffix?: string;
};

export function AppHeader({
  items,
  homeHref = "/",
  desktopActions,
  mobileAccessory,
  mobileContent,
  variant = "default",
  navigationSuffix = "",
}: AppHeaderProps) {
  return (
    <>
      {variant === "dashboard" ? (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-outline-variant bg-surface-container-low lg:flex">
          <div className="border-b border-outline-variant px-6 py-5">
            <Link href={homeHref} className="text-2xl font-bold tracking-[0.12em] text-primary">
              INFLORA
            </Link>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Intelligence Unit
            </p>
          </div>
          <nav aria-label="Dashboard navigation" className="flex-1 space-y-1 px-4 py-8">
            {items.map((item, index) => {
              const Icon = [BarChart3, WalletCards, ChartNoAxesCombined, Lightbulb, Search, FileText][index] ?? BarChart3;
              return (
                <a
                  key={item.href}
                  href={`${item.href}${navigationSuffix}`}
                  className="group flex items-center gap-4 border border-transparent px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-outline-variant hover:bg-surface-container-high hover:text-primary"
                >
                  <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                  {String(index + 1).padStart(2, "0")} {item.label}
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 border-t border-outline-variant p-5">
            <div className="grid h-8 w-8 place-items-center bg-primary text-xs font-bold text-primary-foreground">IN</div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">ANALYST_08</p>
              <p className="font-mono text-[10px] uppercase text-muted-foreground">Senior Strategist</p>
            </div>
          </div>
        </aside>
      ) : null}
      <header className={variant === "dashboard" ? "fixed left-0 right-0 top-0 z-40 border-b border-outline-variant bg-surface lg:left-72" : "fixed left-0 right-0 top-0 z-40 border-b border-primary bg-background"}>
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-12">
        {variant === "dashboard" ? (
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:gap-4 sm:text-[11px] sm:tracking-[0.12em]">
            <span className="shrink-0">/ Terminal</span>
            <span className="h-4 w-px shrink-0 bg-outline-variant" />
            <span className="truncate text-primary">Live Feed: {new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}</span>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href={homeHref}
              className="flex shrink-0 items-center text-xl font-bold tracking-[0.12em] text-primary"
            >
              <span>INFLORA</span>
            </Link>
            <nav aria-label="Primary navigation" className="hidden lg:block">
              <ul className="flex items-center gap-5">
                {items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {desktopActions ? (
          <div className="hidden items-center gap-3 lg:flex">{desktopActions}</div>
        ) : null}

        {variant === "dashboard" ? (
          <div className="hidden items-center gap-5 text-muted-foreground lg:flex">
            <Search className="h-4 w-4" aria-label="Search" />
            <Bell className="h-4 w-4" aria-label="Notifications" />
            <span className="h-6 w-px bg-outline-variant" />
            <button type="button" className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest hover:text-destructive">
              <LogOut className="h-4 w-4" /> Exit
            </button>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {mobileAccessory}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(88vw,22rem)]">
              <SheetHeader>
                <SheetTitle>INFLORA</SheetTitle>
                <SheetDescription>Personal inflation intelligence</SheetDescription>
              </SheetHeader>
              <div className="space-y-6">
                <nav aria-label="Mobile navigation">
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="block min-h-11 border-b border-outline-variant px-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-primary"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                {mobileContent}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </header>
    </>
  );
}
