import Link from "next/link";

import { AppHeader } from "@/components/navigation/AppHeader";
import { Button } from "@/components/ui/button";

import { navItems } from "./data";

export function Header() {
  return (
    <AppHeader
      items={navItems}
      desktopActions={
        <Button asChild variant="outline">
          <Link href="/dashboard?mode=showcase">Explore Dashboard</Link>
        </Button>
      }
      mobileAccessory={
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard?mode=showcase">Explore</Link>
        </Button>
      }
    />
  );
}
