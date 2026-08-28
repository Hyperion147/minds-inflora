import Link from "next/link";

import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="flex flex-col gap-6 border-t border-primary bg-surface px-4 py-12 sm:px-8 lg:px-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <section aria-label="INFLORA company summary">
          <Link href="/" className="inline-flex text-xl font-bold tracking-[0.12em] text-primary">
            INFLORA
          </Link>
        </section>
        <nav aria-label="Footer navigation">
          <ul className="flex gap-5 text-sm text-muted-foreground">
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
      <p className="text-xs uppercase text-end tracking-[0.18em] text-muted-foreground">
        (c) 2026 INFLORA INTELLIGENCE. ALL RIGHTS RESERVED.
      </p>
    </footer>
  );
}
