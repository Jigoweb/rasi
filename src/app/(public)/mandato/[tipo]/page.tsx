import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MandatoForm } from "@/features/public-site/forms/MandatoForm";
import { MANDATO_LABELS, MANDATO_TIPI, type MandatoTipo } from "@/features/public-site/forms/submission-schema";

type Props = { params: Promise<{ tipo: string }> };

function isMandatoTipo(value: string): value is MandatoTipo {
  return (MANDATO_TIPI as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tipo } = await params;
  if (!isMandatoTipo(tipo)) return { title: "Mandato | R.A.S.I." };
  return {
    title: `${MANDATO_LABELS[tipo]} | R.A.S.I.`,
    description: "Invia una richiesta di mandato. Un operatore la valuta senza creare automaticamente l'anagrafica.",
  };
}

export default async function MandatoPage({ params }: Props) {
  const { tipo } = await params;
  if (!isMandatoTipo(tipo)) notFound();

  return (
    <section className="max-w-3xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl font-bold text-anthropic-dark mb-4">
        {MANDATO_LABELS[tipo]}
      </h1>
      <p className="font-lora text-anthropic-mid-gray mb-8">
        Compila il form. La richiesta entra in coda operatori: non viene creato un record artista
        in automatico. Commissione 10% sui compensi liquidati (20% per artisti internazionali).
      </p>
      <MandatoForm tipo={tipo} />
    </section>
  );
}
