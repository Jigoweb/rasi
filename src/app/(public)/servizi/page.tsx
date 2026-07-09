import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "../reveal";
import {
  Megaphone,
  GraduationCap,
  Landmark,
  HeartPulse,
  Briefcase,
  Baby,
  Home,
  Receipt,
  ArrowRight,
} from "lucide-react";

const SERVIZI_ARTISTICI = [
  {
    icon: Megaphone,
    title: "Artisti in azione",
    body: "Promuoviamo le tue opere e i tuoi spettacoli sui nostri canali social (Instagram, Facebook, TikTok, X, YouTube). Candida la tua opera in pochi minuti.",
    cta: "Promuovi la tua opera",
    color: "text-rasi-ember",
  },
  {
    icon: GraduationCap,
    title: "Casting coaching gratuito",
    body: "Sessioni di preparazione al casting riservate agli artisti mandanti RASI, per affrontare i provini con più sicurezza.",
    cta: "Richiedi informazioni",
    color: "text-rasi-logo-indigo",
  },
];

const SERVIZI_BUROCRATICI = [
  { icon: Landmark, label: "Pensioni e previdenza" },
  { icon: HeartPulse, label: "Invalidità" },
  { icon: Briefcase, label: "NASpI e disoccupazione" },
  { icon: Baby, label: "Maternità" },
  { icon: Home, label: "Contratti lavoro domestico" },
  { icon: Receipt, label: "Assistenza fiscale" },
];

export default function ServiziPage() {
  return (
    <div className="font-schibsted">
      {/* Hero */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Servizi gratuiti per chi ha scelto RASI
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Non ci limitiamo a gestire i tuoi diritti: ti aiutiamo a farti conoscere e a orientarti nella burocrazia legata al tuo lavoro d&apos;artista.
          </p>
        </div>
      </section>

      {/* Servizi artistici */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Servizi artistici
          </h2>
          <p className="mt-3 max-w-md text-rasi-slate">
            Promozione e crescita professionale, a costo zero.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {SERVIZI_ARTISTICI.map((servizio, i) => (
            <Reveal key={servizio.title} delayMs={i * 100}>
              <div className="flex h-full flex-col rounded-md bg-rasi-paper p-8">
                <servizio.icon className={`h-8 w-8 ${servizio.color}`} strokeWidth={1.75} />
                <h3 className="mt-4 text-xl font-semibold text-rasi-ink">{servizio.title}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-rasi-slate">{servizio.body}</p>
                <Link href="/contatti" className="mt-6">
                  <Button
                    variant="outline"
                    className="rounded-full border-rasi-ink px-6 text-sm font-semibold text-rasi-ink hover:bg-rasi-ink hover:text-rasi-paper"
                  >
                    {servizio.cta}
                  </Button>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Servizi burocratici */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              Servizi burocratici
            </h2>
            <p className="mt-3 max-w-md text-rasi-slate">
              Supporto su pratiche che consumano tempo, non talento.
            </p>
          </Reveal>

          <Reveal delayMs={100} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-rasi-line md:grid-cols-3">
            {SERVIZI_BUROCRATICI.map((item) => (
              <div key={item.label} className="flex flex-col items-start gap-3 bg-rasi-paper p-6">
                <item.icon className="h-6 w-6 text-rasi-logo-cyan" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-rasi-ink">{item.label}</span>
              </div>
            ))}
          </Reveal>

          <Reveal delayMs={200} className="mt-10">
            <Link href="/contatti">
              <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
                Contatta il servizio burocratico
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA finale */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
              Non sei ancora mandante?
            </h2>
            <p className="mt-2 text-rasi-paper/70">Questi servizi sono riservati agli artisti che aderiscono a RASI.</p>
          </div>
          <Link href="/artisti">
            <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
              Scopri se puoi aderire
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
