import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-anthropic-light text-anthropic-dark font-lora">
      <header className="sticky top-0 z-50 w-full border-b border-anthropic-light-gray bg-anthropic-light/95 backdrop-blur supports-[backdrop-filter]:bg-anthropic-light/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-poppins font-bold text-xl tracking-tight text-anthropic-dark">R.A.S.I.</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center text-sm font-medium font-poppins">
              <Link href="/chi-siamo" className="transition-colors hover:text-anthropic-orange">Chi siamo</Link>
              <Link href="/servizi" className="transition-colors hover:text-anthropic-orange">Servizi</Link>
              <Link href="/news" className="transition-colors hover:text-anthropic-orange">News & Bandi</Link>
              <Link href="/contatti" className="transition-colors hover:text-anthropic-orange">Contatti</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="outline" className="font-poppins rounded-full border-anthropic-dark text-anthropic-dark hover:bg-anthropic-dark hover:text-anthropic-light">
                Area Riservata
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-anthropic-light-gray bg-anthropic-light text-anthropic-mid-gray">
        <div className="container mx-auto py-12 px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-poppins font-bold text-lg text-anthropic-dark">R.A.S.I.</h3>
            <p className="text-sm">Rete Artisti Spettacolo per l'Innovazione. Organismo di gestione collettiva dei diritti connessi al diritto d'autore.</p>
          </div>
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-anthropic-dark">Istituzionale</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/chi-siamo/statuto" className="hover:text-anthropic-orange">Statuto</Link></li>
              <li><Link href="/chi-siamo/privacy-policy" className="hover:text-anthropic-orange">Privacy Policy</Link></li>
              <li><Link href="/chi-siamo/relazione-trasparenza" className="hover:text-anthropic-orange">Trasparenza</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-anthropic-dark">Servizi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/servizi" className="hover:text-anthropic-orange">Award System</Link></li>
              <li><Link href="/modulistica" className="hover:text-anthropic-orange">Modulistica</Link></li>
              <li><Link href="/news" className="hover:text-anthropic-orange">Bandi e Promozione</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-anthropic-dark">Contatti</h4>
            <ul className="space-y-2 text-sm">
              <li>Via Po 43, 00198 Roma</li>
              <li>Tel. +39.06 94364413</li>
              <li>info@reteartistispettacolo.it</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-anthropic-light-gray py-6 text-center text-sm">
          <p>© {new Date().getFullYear()} R.A.S.I. Tutti i diritti riservati. P.IVA IT13451801008</p>
        </div>
      </footer>
    </div>
  );
}