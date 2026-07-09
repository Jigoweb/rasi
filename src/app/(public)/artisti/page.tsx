import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Reveal } from "../reveal";
import {
  ShieldCheck,
  Search,
  Megaphone,
  Handshake,
  Film,
  Music2,
  ArrowRight,
} from "lucide-react";

const VANTAGGI = [
  {
    icon: ShieldCheck,
    title: "Mandato gratuito e revocabile",
    body: "Aderire non costa nulla e non hai vincoli: puoi revocare il mandato in qualsiasi momento, senza spiegazioni né costi di uscita.",
    color: "text-rasi-ember",
  },
  {
    icon: Search,
    title: "Ti troviamo noi",
    body: "Il nostro database incrocia le opere trasmesse dalle emittenti con il repertorio degli artisti mandanti. Se hai partecipato a un'opera andata in onda, ti aiutiamo a identificare compensi che altrimenti andrebbero persi.",
    color: "text-rasi-logo-indigo",
  },
  {
    icon: Megaphone,
    title: "Promozione gratuita",
    body: "Attraverso il servizio Artisti in azione sosteniamo le tue opere e i tuoi spettacoli sui nostri canali social, senza alcun costo per te.",
    color: "text-rasi-logo-magenta",
  },
  {
    icon: Handshake,
    title: "Supporto burocratico",
    body: "Assistenza dedicata su pensioni, invalidità, disoccupazione e altre pratiche amministrative legate alla tua attività artistica.",
    color: "text-rasi-logo-cyan",
  },
];

const FUNZIONAMENTO = [
  "Il mandato è gratuito e revocabile in qualsiasi momento.",
  "Tratteniamo una commissione solo sui compensi che riusciamo effettivamente a farti incassare.",
  "I pagamenti seguono una cadenza periodica, comunicata ad ogni mandante.",
];

const FAQ = [
  {
    q: "Sono un artista interprete o esecutore?",
    a: "Sì, se hai prestato la tua voce, il tuo volto o la tua interpretazione musicale in un'opera trasmessa in Italia o all'estero. Attori, cantanti, musicisti e doppiatori rientrano tutti in questa categoria. Il dettaglio normativo completo è disponibile nella sezione Documenti.",
  },
  {
    q: "Quando matura il compenso?",
    a: "Il compenso matura quando l'opera a cui hai partecipato viene trasmessa da un'emittente e RASI riesce a identificarti come interprete. I criteri esatti sono definiti nel regolamento di ripartizione, consultabile in Documenti.",
  },
  {
    q: "Posso aderire se sono erede di un artista?",
    a: "Sì. Gli eredi di un artista scomparso possono ricevere mandato per i compensi maturati dal proprio congiunto.",
  },
  {
    q: "Sono un produttore fonografico, posso aderire?",
    a: "Sì, RASI gestisce anche i diritti connessi sul lato della produzione musicale.",
  },
];

export default function PerGliArtistiPage() {
  return (
    <div className="font-schibsted">
      {/* Hero */}
      <section className="relative overflow-hidden bg-rasi-ink">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pt-16 pb-16 md:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
              Chi può aderire a RASI
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-rasi-paper/70">
              Se hai prestato la tua interpretazione in un&apos;opera trasmessa in Italia o all&apos;estero, probabilmente hai diritto a un compenso. Ecco come funziona.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/documenti/modulistica">
                <Button className="w-full rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep sm:w-auto">
                  Scarica il mandato
                </Button>
              </Link>
              <Link href="/contatti">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-rasi-paper/30 bg-transparent px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-paper hover:text-rasi-ink sm:w-auto"
                >
                  Contatta RASI
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-md animate-in fade-in duration-1000 delay-150 fill-mode-both">
            <Image
              src="https://picsum.photos/seed/rasi-cantante-studio/1200/900"
              alt="Artista durante una sessione di registrazione"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </div>
        </div>
      </section>

      {/* Perché aderire, versione estesa */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Perché aderire a RASI
          </h2>
        </Reveal>

        <div className="mt-12 divide-y divide-rasi-line border-t border-rasi-line">
          {VANTAGGI.map((vantaggio, i) => (
            <Reveal key={vantaggio.title} delayMs={i * 80}>
              <div className="flex flex-col gap-4 py-8 sm:flex-row sm:gap-10">
                <vantaggio.icon className={`h-7 w-7 shrink-0 ${vantaggio.color}`} strokeWidth={1.75} />
                <div>
                  <h3 className="text-lg font-semibold text-rasi-ink">{vantaggio.title}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-rasi-slate">{vantaggio.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Come funziona il mandato */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-rasi-paper md:text-4xl">
              Come funziona il mandato
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {FUNZIONAMENTO.map((item, i) => (
              <Reveal key={item} delayMs={i * 100}>
                <div className="border-t border-rasi-paper/20 pt-6">
                  <span className="text-sm font-semibold text-rasi-ember">{`0${i + 1}`}</span>
                  <p className="mt-3 leading-relaxed text-rasi-paper/80">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delayMs={300} className="mt-12">
            <Link href="/documenti/modulistica">
              <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
                Scarica il mandato
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              Chi può aderire
            </h2>
          </Reveal>

          <Reveal delayMs={100} className="mt-10">
            <Accordion type="single" collapsible>
              {FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* Il tuo settore */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Il tuo settore
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Reveal>
            <Link
              href="/artisti/video"
              className="group flex h-full flex-col justify-between rounded-md border border-rasi-line bg-rasi-paper p-8 transition-colors hover:border-rasi-ember"
            >
              <div>
                <Film className="h-8 w-8 text-rasi-logo-indigo" strokeWidth={1.75} />
                <h3 className="mt-4 text-xl font-semibold text-rasi-ink">Video</h3>
                <p className="mt-2 leading-relaxed text-rasi-slate">
                  Contratti standard, tariffe di settore ed eleggibilità specifica per chi lavora in opere cinematografiche e televisive.
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-rasi-ink group-hover:text-rasi-ember">
                Scopri il settore Video
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </Link>
          </Reveal>

          <Reveal delayMs={100}>
            <Link
              href="/artisti/musica"
              className="group flex h-full flex-col justify-between rounded-md border border-rasi-line bg-rasi-paper p-8 transition-colors hover:border-rasi-ember"
            >
              <div>
                <Music2 className="h-8 w-8 text-rasi-logo-magenta" strokeWidth={1.75} />
                <h3 className="mt-4 text-xl font-semibold text-rasi-ink">Musica</h3>
                <p className="mt-2 leading-relaxed text-rasi-slate">
                  Tariffe, contratti e criteri di eleggibilità per cantanti, musicisti e direttori d&apos;orchestra.
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-rasi-ink group-hover:text-rasi-ember">
                Scopri il settore Musica
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA finale */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
              Pronto ad aderire?
            </h2>
            <p className="mt-2 text-rasi-paper/70">Scarica il mandato o scrivici se hai dubbi.</p>
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
