"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const NAV_LINKS = [
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/artisti", label: "Per gli artisti" },
  { href: "/servizi", label: "Servizi" },
  { href: "/news", label: "Bandi e news" },
  { href: "/award-system", label: "AWARD System" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-rasi-ink hover:bg-rasi-line"
          aria-label="Apri il menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-rasi-paper">
        <SheetHeader>
          <SheetTitle className="text-rasi-ink">Menu</SheetTitle>
          <SheetDescription className="sr-only">Menu di navigazione del sito RASI</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-semibold text-rasi-ink hover:bg-rasi-line"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="mt-4 rounded-full bg-rasi-ember px-3 py-3 text-center text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep"
          >
            Area riservata
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
