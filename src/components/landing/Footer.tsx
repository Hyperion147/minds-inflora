import Image from "next/image";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-6 flex flex-col gap-6 rounded-md border border-border bg-background px-5 py-8 sm:px-8 lg:px-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <section aria-label="INFLORA company summary">
          <Link href="/" className="inline-flex">
            <Image
              src="/inflora-logo-name.png"
              alt="INFLORA: Personal Inflation Intelligence"
              width={2172}
              height={724}
              sizes="(max-width: 640px) 12rem, 13rem"
              className="h-auto w-48 sm:w-52"
            />
          </Link>
        </section>
        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/dashboard?mode=showcase"
                className="hover:text-foreground"
              >
                Product
              </Link>
            </li>
            <li>
              <a href="#methodology" className="hover:text-foreground">
                Methodology
              </a>
            </li>
            <li>
              <a href="#privacy" className="hover:text-foreground">
                Privacy
              </a>
            </li>
            <li>
              <Link href="/aa-test" className="hover:text-foreground">
                Live Account Aggregator
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <Separator />
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        (c) 2026 INFLORA
      </p>
    </footer>
  );
}
