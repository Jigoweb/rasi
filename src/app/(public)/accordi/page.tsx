import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "../reveal";
import { ArrowRight } from "lucide-react";

const DESCRIZIONE_ART84 =
  "Compensi per tutti gli utilizzi previsti dall'art. 84 della legge 633/41";

const ACCORDI_ITALIA = [
  { nome: "RAI", descrizione: DESCRIZIONE_ART84 },
  {
    nome: "R.T.I. – Mediaset",
    descrizione:
      "Compensi per tutti gli utilizzi previsti dall'art. 84 della legge 633/41 compiuti da RTI e dalle altre società del Gruppo Mediaset.",
  },
  { nome: "LA7", descrizione: DESCRIZIONE_ART84 },
  { nome: "Walt Disney (Fox)", descrizione: DESCRIZIONE_ART84 },
  { nome: "Discovery", descrizione: DESCRIZIONE_ART84 },
  { nome: "Viacom", descrizione: DESCRIZIONE_ART84 },
  { nome: "TIMvision", descrizione: DESCRIZIONE_ART84 },
  { nome: "Chili", descrizione: DESCRIZIONE_ART84 },
  { nome: "Italo Live", descrizione: DESCRIZIONE_ART84 },
  { nome: "Universal Pictures", descrizione: DESCRIZIONE_ART84 },
  { nome: "Netflix", descrizione: DESCRIZIONE_ART84 },
];

const PAESI_VIDEO = [
  "Romania",
  "Francia",
  "Spagna",
  "Portogallo",
  "Austria",
  "Slovenia",
  "Albania",
  "Grecia",
  "Belgio",
  "Danimarca",
  "Polonia",
  "Regno Unito",
  "Turchia",
  "Colombia",
];

const PAESI_MUSICA = [
  "Azerbaijan",
  "Belgio",
  "Bielorussia",
  "Brasile",
  "Bulgaria",
  "Canada",
  "Cipro",
  "Corea del Sud",
  "Croazia",
  "Danimarca",
  "Estonia",
  "Francia",
  "Finlandia",
  "Germania",
  "Giappone",
  "Gran Bretagna",
  "Grecia",
  "India",
  "Irlanda",
  "Kazakistan",
  "Lettonia",
  "Lituania",
  "Moldavia",
  "Norvegia",
  "Olanda",
  "Polonia",
  "Portogallo",
  "Repubblica Ceca",
  "Romania",
  "Russia",
  "Serbia",
  "Slovacchia",
  "Slovenia",
  "Spagna",
  "Svezia",
  "Svizzera",
  "Sud Africa",
  "Ungheria",
  "USA",
];

function AccordoRow({ nome, descrizione }: { nome: string; descrizione: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-rasi-line py-5 sm:flex-row sm:items-start sm:gap-8">
      <span className="font-semibold text-rasi-ink sm:w-56 sm:shrink-0">{nome}</span>
      <span className="text-sm leading-relaxed text-rasi-slate">{descrizione}</span>
    </div>
  );
}

function PaesiGrid({ paesi }: { paesi: string[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 md:grid-cols-4">
      {paesi.map((paese) => (
        <span key={paese} className="text-sm text-rasi-ink">
          {paese}
        </span>
      ))}
    </div>
  );
}

export default function AccordiPage() {
  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-sm font-semibold uppercase tracking-wide text-rasi-paper/50">
            Rete Artisti Spettacolo per l&apos;Innovazione
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Accordi
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            RASI ha accordi attivi con le principali emittenti e piattaforme italiane, oltre a rapporti con organismi omologhi esteri per la tutela dei diritti connessi.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Accordi R.A.S.I. Italia
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-rasi-slate">
            Accordi con le principali emittenti e piattaforme nazionali per la gestione dei compensi dovuti agli artisti interpreti ed esecutori.
          </p>
          <div className="mt-8 border-b border-rasi-line">
            {ACCORDI_ITALIA.map((accordo) => (
              <AccordoRow key={accordo.nome} {...accordo} />
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={100} className="mt-16">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Accordi internazionali R.A.S.I.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-rasi-slate">
            RASI collabora con organismi di gestione collettiva omologhi all&apos;estero, garantendo ai propri mandanti la tutela dei diritti anche sulle opere trasmesse fuori dal territorio italiano.
          </p>
        </Reveal>

        <Reveal delayMs={150} className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-rasi-slate">
            Settore video
          </h3>
          <p className="mt-2 text-sm text-rasi-slate">
            Paesi esteri dai quali R.A.S.I. raccoglie diritti:
          </p>
          <PaesiGrid paesi={PAESI_VIDEO} />
        </Reveal>

        <Reveal delayMs={200} className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-rasi-slate">
            Settore musica
          </h3>
          <p className="mt-2 text-sm text-rasi-slate">
            Paesi esteri dai quali R.A.S.I. raccoglie diritti:
          </p>
          <PaesiGrid paesi={PAESI_MUSICA} />
        </Reveal>
      </section>

      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
              Hai bisogno di ulteriori informazioni?
            </h2>
            <p className="mt-2 text-rasi-paper/70">
              Orientarsi per la tutela dei tuoi diritti è importante, RASI è al tuo fianco.
            </p>
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
