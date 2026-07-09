import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "../reveal";
import { ArrowRight } from "lucide-react";

const TIMELINE = [
  { data: "9 marzo 2012", evento: "Fondazione di RASI." },
  {
    data: "6 ottobre 2017",
    evento: "Iscrizione al registro AGCOM degli organismi di gestione collettiva.",
  },
];

const CDA = [
  { nome: "Paolo Pesce", ruolo: "Presidente", bio: "già Attore, esperto nelle attività di promozione dello spettacolo" },
  { nome: "Manfredo Di Crescenzo", ruolo: "Consigliere di amministrazione", bio: "Musicista, direttore d'orchestra" },
  { nome: "Lorenzo Gioielli", ruolo: "Consigliere di amministrazione", bio: "Attore, regista, autore" },
  { nome: "Maurizio Manfrini", ruolo: "Consigliere di amministrazione", bio: "Organizzatore eventi di musica e cinema" },
  { nome: "Sonia Quercia", ruolo: "Consigliera di amministrazione", bio: "Organizzatrice eventi di musica e cinema" },
];

const SORVEGLIANZA = [
  { nome: "Maurizio Di Carmine", ruolo: "Presidente", bio: "Attore" },
  { nome: "Ramona Badescu", ruolo: "Membro", bio: "Attrice, cantante" },
  { nome: "Lino Damiani", ruolo: "Membro", bio: "Attore, regista" },
  { nome: "Ilaria Della Bidia", ruolo: "Membro", bio: "Cantante, compositrice" },
  { nome: "Cecilia Herrera", ruolo: "Membro", bio: "Cantante" },
  { nome: "Fabrizio Traversa", ruolo: "Membro", bio: "Attore" },
];

const CONTROLLO = [
  { nome: "Francesco Bonelli", ruolo: "Revisore legale dei conti", bio: "Organo di Controllo Contabile" },
];

function PersonRow({ nome, ruolo, bio }: { nome: string; ruolo: string; bio: string }) {
  return (
    <div className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-8">
      <div className="sm:w-56 sm:shrink-0">
        <span className="font-semibold text-rasi-ink">{nome}</span>
        <span className="block text-sm text-rasi-slate sm:hidden">{ruolo}</span>
      </div>
      <span className="hidden text-sm text-rasi-slate sm:block sm:w-64 sm:shrink-0">{ruolo}</span>
      <span className="text-sm text-rasi-slate">{bio}</span>
    </div>
  );
}

export default function ChiSiamoPage() {
  return (
    <div className="font-schibsted">
      {/* Hero */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Chi siamo
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            RASI è l&apos;organismo di gestione collettiva nato per dare agli artisti interpreti ed esecutori uno strumento serio, trasparente ed equo per la tutela dei propri diritti connessi.
          </p>
        </div>
      </section>

      {/* Missione */}
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Missione
          </h2>
          <div className="mt-6 space-y-4 leading-relaxed text-rasi-slate">
            <p>
              Gli artisti maturano diritti economici spesso senza saperlo, o senza gli strumenti per farli valere. RASI colma questo divario: identifica le opere trasmesse, riconosce gli artisti che vi hanno preso parte e amministra i compensi che ne derivano.
            </p>
            <p>
              Lavoriamo secondo principi di trasparenza, pubblicità, equità e imparzialità. I pagamenti seguono una cadenza periodica, comunicata ad ogni mandante, e ci impegniamo attivamente nella tutela dei diritti contro utilizzi non autorizzati delle opere.
            </p>
          </div>
        </Reveal>
      </section>

      {/* La nostra storia */}
      <section className="bg-rasi-paper py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              La nostra storia
            </h2>
          </Reveal>
          <div className="mt-10 space-y-8 border-l-2 border-rasi-line pl-8">
            {TIMELINE.map((tappa, i) => (
              <Reveal key={tappa.data} delayMs={i * 100} className="relative">
                <span className="absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full bg-rasi-ember" />
                <span className="text-sm font-semibold text-rasi-ember">{tappa.data}</span>
                <p className="mt-1 text-rasi-ink">{tappa.evento}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Chi guida RASI */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Chi guida RASI
          </h2>
        </Reveal>

        <Reveal delayMs={100} className="mt-10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-rasi-slate">
            Consiglio di Amministrazione
          </h3>
          <div className="mt-2 divide-y divide-rasi-line border-t border-rasi-line">
            {CDA.map((persona) => (
              <PersonRow key={persona.nome} {...persona} />
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={150} className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-rasi-slate">
            Comitato di Sorveglianza
          </h3>
          <div className="mt-2 divide-y divide-rasi-line border-t border-rasi-line">
            {SORVEGLIANZA.map((persona) => (
              <PersonRow key={persona.nome} {...persona} />
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={200} className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-rasi-slate">
            Organo di Controllo Contabile
          </h3>
          <div className="mt-2 divide-y divide-rasi-line border-t border-rasi-line">
            {CONTROLLO.map((persona) => (
              <PersonRow key={persona.nome} {...persona} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA finale */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
              Vuoi sapere di più su come lavoriamo?
            </h2>
          </div>
          <Link href="/chi-siamo/statuto">
            <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
              Leggi lo Statuto
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
