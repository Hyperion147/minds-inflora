import { cn } from "@/lib/utils";

import { trustItems } from "./data";

export function TrustBar() {
  return (
    <section aria-label="INFLORA trust pillars">
      <ol className="mt-6 grid overflow-hidden rounded-md border border-border bg-card md:grid-cols-4">
        {trustItems.map(([number, label], index) => (
          <li
            key={label}
            className={cn(
              "min-h-28 p-6 sm:p-7",
              index < trustItems.length - 1 &&
                "border-b border-border md:border-b-0 md:border-r",
            )}
          >
            <p className="font-mono text-xs text-muted-foreground">{number}</p>
            <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
