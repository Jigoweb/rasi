import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "../reveal";
import {
  Archive,
  SearchCheck,
  Calculator,
  Banknote,
  ArrowRight,
} from "lucide-react";

const FASI = [
  {
    icon: Archive,
    title: "Archiviazione",
    body: "Due database, musica e audiovisivo, con i metadati di ogni opera: titoli, interpreti, codici ISRC, dati di produzione.",
    color: "text-rasi-ember",
  },
  {
    icon: SearchCheck,
    title: "Individuazione titolari",
    body: "I palinsesti delle emittenti vengono incrociati con il database per riconoscere gli artisti mandanti presenti in ogni opera trasmessa.",
    color: "text-rasi-logo-indigo",
  },
  {
    icon: Calculator,
    title: "Ripartizione",
    body: "Il compenso viene calcolato secondo il regolamento di ripartizione.",
    color: "text-rasi-logo-magenta",
  },
  {
    icon: Banknote,
    title: "Pagamento",
    body: "RASI genera ed emette i mandati di pagamento agli aventi diritto.",
    color: "text-rasi-logo-cyan",
  },
];

export default function AwardSystemPage() {
  return (
    <div className="font-schibsted">
      {/* Hero */}
      <section className="relative overflow-hidden bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            AWARD System, il database che trova i tuoi diritti
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Artists-Works Art-Rights-Data. Il sistema con cui RASI archivia le opere, identifica gli aventi diritto e genera i pagamenti.
          </p>
        </div>
      </section>

      {/* Come funziona */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              Come funziona
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-md bg-rasi-line sm:grid-cols-2">
            {FASI.map((fase, i) => (
              <Reveal key={fase.title} delayMs={i * 100} className={i % 2 === 0 ? "bg-white" : "bg-rasi-paper"}>
                <div className="p-8">
                  <fase.icon className={`h-6 w-6 ${fase.color}`} strokeWidth={1.75} />
                  <h3 className="mt-4 text-lg font-semibold text-rasi-ink">{fase.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-rasi-slate">{fase.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Consulta la tua posizione */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
            Consulta la tua posizione
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-rasi-paper/70">
            Se sei un artista mandante, puoi consultare il tuo repertorio, le individuazioni e le ripartizioni direttamente dalla tua area riservata. Stesso accesso di questo sito, nessun account separato da creare.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth">
              <Button className="w-full rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep sm:w-auto">
                Accedi alla tua area riservata
              </Button>
            </Link>
            <Link href="/artisti">
              <Button
                variant="outline"
                className="w-full rounded-full border-rasi-paper/30 bg-transparent px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-paper hover:text-rasi-ink sm:w-auto"
              >
                Scopri come aderire
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-rasi-paper/50">Non sei ancora mandante?</p>
        </Reveal>
      </section>
    </div>
  );
}
