import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { PromozioneForm } from "@/features/public-site/forms/PromozioneForm";

export const metadata: Metadata = {
  title: "Artisti in azione | R.A.S.I.",
  description: "Servizio gratuito di promozione social riservato agli artisti mandanti R.A.S.I.",
};

export default function ArtistiInAzionePage() {
  return (
    <section className="max-w-3xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-6">
        Artisti in azione
      </h1>
      <p className="font-lora text-lg text-anthropic-dark/80 mb-6">
        Servizio gratuito ed esclusivo per gli artisti mandanti: R.A.S.I. sostiene la promozione di
        opere, spettacoli ed eventi su Instagram, Facebook, TikTok, X e YouTube.
      </p>
      <p className="font-lora text-anthropic-dark/70 mb-10">
        Compila il form e invia il materiale. Un operatore valuta la richiesta: non viene creato
        automaticamente un profilo artista.
      </p>
      <Link href="/artisti-in-azione#promuovi">
        <Button className="font-poppins rounded-full bg-anthropic-orange text-anthropic-light hover:bg-anthropic-orange/90">
          Desidero promuovere la mia opera
        </Button>
      </Link>
      <div id="promuovi" className="mt-12">
        <PromozioneForm />
      </div>
    </section>
  );
}
