"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useAuth } from "@/shared/contexts/auth-context";
import { publicNav, type NavItem } from "../nav";
import { AWARD_SYSTEM_URL, SITE_CONTACTS, SITE_NAME } from "../site-info";

function NavDropdown({ item }: { item: NavItem }) {
  if (!item.children?.length) {
    return (
      <Link
        href={item.href}
        className="text-sm font-medium font-poppins transition-colors hover:text-anthropic-orange"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-sm font-medium font-poppins transition-colors hover:text-anthropic-orange outline-none">
        {item.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto min-w-64">
        {item.children.map((group, gi) => (
          <div key={`${item.label}-${gi}`}>
            {group.label ? <DropdownMenuLabel>{group.label}</DropdownMenuLabel> : null}
            {group.items.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href}>{link.label}</Link>
              </DropdownMenuItem>
            ))}
            {gi < item.children!.length - 1 ? <DropdownMenuSeparator /> : null}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavLinks() {
  return (
    <nav className="flex flex-col gap-6 py-4">
      {publicNav.map((item) => (
        <div key={item.label} className="space-y-2">
          <Link href={item.href} className="font-poppins font-semibold text-anthropic-dark">
            {item.label}
          </Link>
          {item.children?.map((group, gi) => (
            <div key={gi} className="pl-3 space-y-1">
              {group.label ? (
                <div className="text-xs uppercase tracking-wide text-anthropic-mid-gray pt-2">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-anthropic-dark/80 hover:text-anthropic-orange py-1"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function PublicHeader() {
  const { user } = useAuth();
  const reservedHref = user ? "/dashboard" : "/auth";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-anthropic-light-gray bg-anthropic-light/95 backdrop-blur">
      <div className="hidden lg:flex container mx-auto items-center justify-between px-4 py-2 text-xs text-anthropic-mid-gray font-poppins">
        <div className="flex gap-4">
          <a href={SITE_CONTACTS.phoneHref}>{SITE_CONTACTS.phone}</a>
          <span>{SITE_CONTACTS.hours}</span>
        </div>
        <a
          href={AWARD_SYSTEM_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-anthropic-orange"
        >
          Award System
        </a>
      </div>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-poppins font-bold text-xl tracking-tight text-anthropic-dark">
            {SITE_NAME}
          </Link>
          <nav className="hidden xl:flex gap-5 items-center">
            {publicNav.map((item) => (
              <NavDropdown key={item.label} item={item} />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href={reservedHref}>
            <Button
              variant="outline"
              className="font-poppins rounded-full border-anthropic-dark text-anthropic-dark hover:bg-anthropic-dark hover:text-anthropic-light"
            >
              Area Riservata
            </Button>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Apri menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto w-80">
              <SheetHeader>
                <SheetTitle className="font-poppins">{SITE_NAME}</SheetTitle>
              </SheetHeader>
              <MobileNavLinks />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
