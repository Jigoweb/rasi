import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export function HomeArtistiInAzione() {
  return (
    <section className="w-full py-20 bg-[#f4f2eb]">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <h2 className="font-poppins text-3xl md:text-4xl font-bold text-anthropic-dark mb-6">
          Artisti in azione
        </h2>
        <p className="font-lora text-lg text-anthropic-dark/80 mb-6">
          Servizio gratuito ed esclusivo per i mandanti: promozione di opere, spettacoli ed eventi
          su Instagram, Facebook, TikTok, X e YouTube.
        </p>
        <Link href="/artisti-in-azione#promuovi">
          <Button className="font-poppins rounded-full bg-anthropic-orange text-anthropic-light hover:bg-anthropic-orange/90">
            Desidero promuovere la mia opera
          </Button>
        </Link>
      </div>
    </section>
  );
}
