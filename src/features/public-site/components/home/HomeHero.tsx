import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export function HomeHero() {
  return (
    <section className="relative w-full py-20 md:py-32 overflow-hidden bg-anthropic-dark text-anthropic-light">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <p className="font-poppins text-xs tracking-[0.25em] uppercase text-anthropic-orange mb-6">
          Organismo di gestione collettiva dei diritti connessi al diritto d&apos;autore
        </p>
        <h1 className="font-poppins text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mb-6">
          R.A.S.I. ricerca, negozia, incassa e liquida i compensi agli artisti.
        </h1>
        <p className="text-lg md:text-xl text-anthropic-mid-gray max-w-2xl font-light mb-10">
          Tutela e promozione dei diritti di musicisti, interpreti di opere cinematografiche
          e assimilate, previsti dalla legge n. 633 del 1941.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/mandato/artista">
            <Button
              size="lg"
              className="w-full sm:w-auto font-poppins rounded-full bg-anthropic-orange text-anthropic-light hover:bg-anthropic-orange/90 text-lg px-8 h-14"
            >
              Firma il mandato
            </Button>
          </Link>
          <Link href="/chi-siamo">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto font-poppins rounded-full border-anthropic-mid-gray text-anthropic-light hover:bg-anthropic-light hover:text-anthropic-dark text-lg px-8 h-14"
            >
              Chi siamo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
