import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MobileNav } from "./mobile-nav";

const NAV_LINKS = [
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/artisti", label: "Per gli artisti" },
  { href: "/servizi", label: "Servizi" },
  { href: "/news", label: "Bandi e news" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-rasi-paper text-rasi-ink font-schibsted">
      <header className="sticky top-0 z-50 w-full border-b border-rasi-line bg-rasi-paper/95 backdrop-blur supports-[backdrop-filter]:bg-rasi-paper/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex items-center -space-x-1" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-rasi-logo-indigo" />
              <span className="h-2.5 w-2.5 rounded-full bg-rasi-logo-magenta" />
              <span className="h-2.5 w-2.5 rounded-full bg-rasi-logo-cyan" />
            </span>
            <span className="font-bold text-lg tracking-tight text-rasi-ink">R.A.S.I.</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-rasi-ink transition-colors hover:text-rasi-ember"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/award-system" className="hidden md:block">
              <Button
                variant="ghost"
                className="text-sm font-semibold text-rasi-ink hover:bg-rasi-line hover:text-rasi-ink"
              >
                AWARD System
              </Button>
            </Link>
            <Link href="/auth">
              <Button className="rounded-full bg-rasi-ember px-5 text-sm font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
                Area riservata
              </Button>
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-rasi-line bg-rasi-paper text-rasi-slate">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-rasi-ink">R.A.S.I.</h3>
            <p className="text-sm leading-relaxed">
              Rete Artisti Spettacolo. Organismo di gestione collettiva dei diritti connessi al diritto d&apos;autore.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-rasi-ink">Sito</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/chi-siamo" className="hover:text-rasi-ember">Chi siamo</Link></li>
              <li><Link href="/artisti" className="hover:text-rasi-ember">Per gli artisti</Link></li>
              <li><Link href="/servizi" className="hover:text-rasi-ember">Servizi</Link></li>
              <li><Link href="/news" className="hover:text-rasi-ember">Bandi e news</Link></li>
              <li><Link href="/accordi" className="hover:text-rasi-ember">Accordi</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-rasi-ink">Documenti</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/chi-siamo/statuto" className="hover:text-rasi-ember">Statuto e regolamenti</Link></li>
              <li><Link href="/norme" className="hover:text-rasi-ember">Norme</Link></li>
              <li><Link href="/chi-siamo/relazione-di-trasparenza" className="hover:text-rasi-ember">Relazione di trasparenza</Link></li>
              <li><Link href="/modulistica" className="hover:text-rasi-ember">Modulistica</Link></li>
              <li><Link href="/chi-siamo/privacy-policy" className="hover:text-rasi-ember">Privacy e cookie policy</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-rasi-ink">Contatti</h4>
            <ul className="space-y-2 text-sm">
              <li>Via Po 43, 00198 Roma</li>
              <li>info@reteartistispettacolo.it</li>
              <li><Link href="/contatti" className="hover:text-rasi-ember">Scrivi a RASI</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-rasi-line px-4 py-6 text-center text-xs md:px-6">
          © {new Date().getFullYear()} R.A.S.I. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
}
