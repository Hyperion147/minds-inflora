"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

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
};

export function AppHeader({
  items,
  homeHref = "/",
  desktopActions,
  mobileAccessory,
  mobileContent,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href={homeHref}
            className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-[0.24em] text-foreground"
          >
            <Image
              src="/inflora-logo.png"
              alt=""
              width={1024}
              height={1024}
              sizes="34px"
              priority
              className="h-8 w-8 rounded-sm sm:h-9 sm:w-9"
            />
            <span>INFLORA</span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden lg:block">
            <ul className="flex items-center gap-5">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {desktopActions ? (
          <div className="hidden items-center gap-3 lg:flex">{desktopActions}</div>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {mobileAccessory}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>INFLORA</SheetTitle>
                <SheetDescription>Personal inflation intelligence</SheetDescription>
              </SheetHeader>
              <div className="space-y-6">
                <nav aria-label="Mobile navigation">
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
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
  );
}
