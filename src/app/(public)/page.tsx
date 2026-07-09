import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "./reveal";
import {
  ShieldCheck,
  Search,
  Megaphone,
  Handshake,
  ArrowRight,
} from "lucide-react";

const VANTAGGI = [
  {
    icon: ShieldCheck,
    title: "Mandato gratuito e revocabile",
    body: "Nessun costo per aderire. Puoi revocare il mandato quando vuoi, senza vincoli.",
    color: "text-rasi-ember",
    bg: "bg-white",
  },
  {
    icon: Search,
    title: "Ti troviamo noi",
    body: "Incrociamo le opere trasmesse con il repertorio dei mandanti per trovare compensi che altrimenti andrebbero persi.",
    color: "text-rasi-logo-indigo",
    bg: "bg-rasi-paper",
  },
  {
    icon: Megaphone,
    title: "Promozione gratuita",
    body: "Sosteniamo le tue opere sui social attraverso il servizio Artisti in azione.",
    color: "text-rasi-logo-magenta",
    bg: "bg-rasi-paper",
  },
  {
    icon: Handshake,
    title: "Supporto burocratico",
    body: "Assistenza su welfare, fisco e pratiche amministrative legate alla tua attività.",
    color: "text-rasi-logo-cyan",
    bg: "bg-white",
  },
];

const PROFILI = [
  {
    title: "Interpreti ed esecutori",
    body: "Attori, cantanti, musicisti, doppiatori: chi ha prestato la propria interpretazione in un'opera audiovisiva o musicale.",
  },
  {
    title: "Eredi",
    body: "Chi ha diritto a percepire compensi maturati da un artista scomparso.",
  },
  {
    title: "Produttori fonografici",
    body: "Per la gestione dei diritti sul lato produzione musicale.",
  },
];

const NUMERI = [
  { value: "2.500+", label: "Artisti mandanti" },
  { value: "41.000+", label: "Opere in repertorio" },
  { value: "490k €", label: "Diritti gestiti" },
  { value: "1.300", label: "Azioni a tutela" },
];

export default function Home() {
  return (
    <div className="font-schibsted">
      {/* Hero */}
      <section className="relative overflow-hidden bg-rasi-ink">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pt-16 pb-16 md:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
              Diritti d&apos;artista, tutelati sul serio.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-rasi-paper/70">
              RASI amministra i diritti connessi degli artisti interpreti ed esecutori. Mandato gratuito, promozione delle tue opere inclusa.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/artisti">
                <Button className="w-full rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep sm:w-auto">
                  Scopri se puoi aderire
                </Button>
              </Link>
              <Link href="/modulistica">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-rasi-paper/30 bg-transparent px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-paper hover:text-rasi-ink sm:w-auto"
                >
                  Scarica il mandato
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-md animate-in fade-in duration-1000 delay-150 fill-mode-both">
            <Image
              src="https://picsum.photos/seed/rasi-artista-palco/1200/900"
              alt="Artista interprete durante un'esibizione dal vivo"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </div>
        </div>
      </section>

      {/* A chi ci rivolgiamo */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <Reveal className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              A chi ci rivolgiamo
            </h2>
            <p className="mt-4 max-w-sm text-rasi-slate">
              Se ti riconosci in uno di questi profili, probabilmente hai diritto a un compenso che RASI può aiutarti a ottenere.
            </p>
          </div>

          <div className="divide-y divide-rasi-line border-t border-rasi-line">
            {PROFILI.map((profilo) => (
              <div
                key={profilo.title}
                className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <h3 className="text-lg font-semibold text-rasi-ink sm:w-56 sm:shrink-0">
                  {profilo.title}
                </h3>
                <p className="text-rasi-slate">{profilo.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Perché aderire */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              Perché aderire a RASI
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-md bg-rasi-line sm:grid-cols-2">
            {VANTAGGI.map((vantaggio, i) => (
              <Reveal key={vantaggio.title} delayMs={i * 100} className={vantaggio.bg}>
                <div className="p-8">
                  <vantaggio.icon className={`h-6 w-6 ${vantaggio.color}`} strokeWidth={1.75} />
                  <h3 className="mt-4 text-lg font-semibold text-rasi-ink">{vantaggio.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-rasi-slate">{vantaggio.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Numeri */}
      <section className="border-y border-rasi-line bg-rasi-paper py-16">
        <Reveal className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-6">
          {NUMERI.map((numero) => (
            <div key={numero.label} className="text-center">
              <div className="text-3xl font-bold tracking-tight text-rasi-ink md:text-4xl">
                {numero.value}
              </div>
              <div className="mt-1 text-sm text-rasi-slate">{numero.label}</div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* CTA finale */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
              Non sai se puoi aderire?
            </h2>
            <p className="mt-2 text-rasi-paper/70">Scrivici, ti rispondiamo noi.</p>
          </div>
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
