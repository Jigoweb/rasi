import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Reveal } from "@/app/(public)/reveal";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
import type { SettoreArtistiContent } from "../content/settore-artisti-content";

type SettoreArtistiPageProps = {
  content: SettoreArtistiContent;
};

export function SettoreArtistiPage({ content }: SettoreArtistiPageProps) {
  const { tariffe, elencoOpere } = content;

  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-sm font-semibold uppercase tracking-wide text-rasi-paper/50">
            Rete Artisti Spettacolo per l&apos;Innovazione
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            {content.heroTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            {content.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/modulistica">
              <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
                Scarica il mandato
              </Button>
            </Link>
            <Link href="/contatti">
              <Button
                variant="outline"
                className="rounded-full border-rasi-paper/30 bg-transparent px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-paper hover:text-rasi-ink"
              >
                Contatta RASI
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Perché associarti a RASI
          </h2>
        </Reveal>

        <div className="mt-12 divide-y divide-rasi-line border-t border-rasi-line">
          {content.benefits.map((benefit, i) => (
            <Reveal key={benefit.title} delayMs={i * 80}>
              <div className="flex flex-col gap-4 py-8 sm:flex-row sm:gap-10">
                <benefit.icon className={`h-7 w-7 shrink-0 ${benefit.color}`} strokeWidth={1.75} />
                <div>
                  <h3 className="text-lg font-semibold text-rasi-ink">{benefit.title}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-rasi-slate">{benefit.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              Domande frequenti
            </h2>
          </Reveal>

          <Reveal delayMs={100} className="mt-10">
            <Accordion type="single" collapsible>
              {content.faq.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Tariffe per utilizzatori
          </h2>
          <p className="mt-3 text-sm font-semibold text-rasi-ember">{tariffe.validityNote}</p>
          <p className="mt-4 max-w-2xl leading-relaxed text-rasi-slate">{tariffe.licenseBody}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-rasi-slate">{tariffe.paymentNote}</p>
        </Reveal>

        <Reveal delayMs={80} className="mt-10">
          <Accordion type="multiple" className="w-full">
            {tariffe.sections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left text-base font-semibold text-rasi-ink">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-2">
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-rasi-slate">
                        {paragraph}
                      </p>
                    ))}

                    {section.flatRates?.map((rate) => (
                      <p
                        key={rate.slice(0, 48)}
                        className="border-t border-rasi-line pt-3 text-sm font-medium leading-relaxed text-rasi-ink"
                      >
                        {rate}
                      </p>
                    ))}

                    {section.tables?.map((table) => (
                      <div key={`${section.id}-${table.title ?? table.headers.join("-")}`} className="space-y-2">
                        {table.title ? (
                          <h4 className="text-sm font-semibold text-rasi-ink">{table.title}</h4>
                        ) : null}
                        {table.note ? (
                          <p className="text-sm leading-relaxed text-rasi-slate">{table.note}</p>
                        ) : null}
                        <div className="overflow-x-auto border-t border-rasi-line">
                          <table className="w-full min-w-[28rem] text-left text-sm">
                            <thead>
                              <tr className="border-b border-rasi-line">
                                {table.headers.map((header) => (
                                  <th
                                    key={header}
                                    className="py-3 pr-4 font-semibold text-rasi-ink first:pl-0"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row) => (
                                <tr key={row.join("|")} className="border-b border-rasi-line/70">
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={`${row[0]}-${cellIndex}`}
                                      className={`py-3 pr-4 ${cellIndex === 0 ? "text-rasi-ink" : "tabular-nums text-rasi-slate"}`}
                                    >
                                      {cell || "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    {section.reductions && section.reductions.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-rasi-slate">
                          Riduzioni previste
                        </h4>
                        <ul className="mt-2 space-y-1">
                          {section.reductions.map((item) => (
                            <li key={item} className="text-sm leading-relaxed text-rasi-slate">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {section.pdfUrl ? (
                      <a
                        href={section.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-rasi-ember hover:text-rasi-ember-deep"
                      >
                        {section.pdfLabel ?? "Scarica PDF"}
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                      </a>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <Reveal delayMs={160} className="mt-10">
          <Link href="/contatti">
            <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
              Richiedi una licenza
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </Reveal>
      </section>

      <section className="bg-rasi-paper py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-4xl flex-col gap-6 px-4 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
              {elencoOpere.title}
            </h2>
            <p className="mt-4 leading-relaxed text-rasi-slate">{elencoOpere.body}</p>
          </div>
          {elencoOpere.external ? (
            <a
              href={elencoOpere.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                variant="outline"
                className="rounded-full border-rasi-ink px-8 py-6 text-base font-semibold text-rasi-ink hover:bg-rasi-ink hover:text-rasi-paper"
              >
                {elencoOpere.ctaLabel}
                <ExternalLink className="ml-1 h-4 w-4" strokeWidth={2} />
              </Button>
            </a>
          ) : (
            <Link href={elencoOpere.href}>
              <Button
                variant="outline"
                className="rounded-full border-rasi-ink px-8 py-6 text-base font-semibold text-rasi-ink hover:bg-rasi-ink hover:text-rasi-paper"
              >
                {elencoOpere.ctaLabel}
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
              </Button>
            </Link>
          )}
        </Reveal>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-rasi-ink md:text-4xl">
            Modulistica e regolamenti
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-rasi-slate">
            Mandati, regolamenti di ripartizione, schede repertorio e informativa privacy sono disponibili per il download.
          </p>
        </Reveal>

        <Reveal delayMs={100} className="mt-8 divide-y divide-rasi-line border-t border-rasi-line">
          {content.documents.map((doc) => (
            <Link
              key={doc.label}
              href={doc.href}
              className="group flex items-center gap-4 py-5 transition-colors"
            >
              <FileText
                className="h-5 w-5 shrink-0 text-rasi-ember transition-colors group-hover:text-rasi-ember-deep"
                strokeWidth={1.75}
              />
              <span className="font-medium text-rasi-ink group-hover:text-rasi-ember">{doc.label}</span>
              <ArrowRight
                className="ml-auto h-4 w-4 shrink-0 text-rasi-slate opacity-0 transition-opacity group-hover:opacity-100"
                strokeWidth={2}
              />
            </Link>
          ))}
        </Reveal>
      </section>

      <section className="bg-rasi-ink py-16 md:py-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-rasi-paper md:text-4xl">
              Pronto ad aderire?
            </h2>
            <p className="mt-2 text-rasi-paper/70">
              Scarica il mandato o scrivici se hai dubbi sui tuoi diritti connessi.
            </p>
          </div>
          <Link href="/contatti">
            <Button className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep">
              Contattaci subito
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
