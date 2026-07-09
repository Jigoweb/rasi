import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "../../reveal";
import { ArrowRight } from "lucide-react";

export default function SettoreMusicaPage() {
  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Settore Musica
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Se sei cantante, musicista o direttore d&apos;orchestra e la tua interpretazione è stata trasmessa in Italia o all&apos;estero, RASI gestisce i tuoi diritti connessi.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="space-y-4 leading-relaxed text-rasi-slate">
          <p>
            Il settore musica comprende cantanti, musicisti, direttori d&apos;orchestra e altri interpreti di opere musicali trasmesse via radio, TV o piattaforme digitali.
          </p>
          <p>
            RASI amministra accordi con emittenti radiotelevisive e piattaforme musicali, individua i brani trasmessi in cui compaiono i propri mandanti e gestisce la ripartizione dei compensi derivanti.
          </p>
          <p>
            Contratti tipo, tariffe di settore e dettagli sull&apos;eleggibilità specifica per la musica sono disponibili su richiesta.
          </p>
        </Reveal>

        <Reveal delayMs={100} className="mt-10">
          <Link href="/contatti">
            <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
              Contatta RASI
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
