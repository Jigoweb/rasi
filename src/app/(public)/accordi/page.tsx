import { Reveal } from "../reveal";

const PARTNER_NAZIONALI = [
  "RAI",
  "RTI - Mediaset",
  "LA7",
  "Disney / Fox",
  "Discovery",
  "Viacom",
  "TIMvision",
  "Chili",
  "Italo Live",
  "Universal",
  "Netflix",
];

export default function AccordiPage() {
  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Accordi
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            RASI ha accordi attivi con le principali emittenti e piattaforme italiane, oltre a rapporti con organismi omologhi esteri.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Partner nazionali
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {PARTNER_NAZIONALI.map((nome) => (
              <div key={nome} className="border-t border-rasi-line py-3 text-rasi-ink">
                {nome}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={100} className="mt-16">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Accordi internazionali
          </h2>
          <p className="mt-6 leading-relaxed text-rasi-slate">
            RASI collabora con organismi di gestione collettiva omologhi in oltre 14 paesi per il settore video e 39 paesi per il settore musicale, garantendo ai propri mandanti la tutela dei diritti anche sulle opere trasmesse all&apos;estero.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
